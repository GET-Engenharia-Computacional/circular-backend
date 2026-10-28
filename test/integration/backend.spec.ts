import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import dataSource from '../../src/database/data-source';
import { TelemetryService } from '../../src/telemetry/telemetry.service';

interface Ack {
  ok: boolean;
  data?: unknown;
  error?: { status: number; detail: unknown };
}
const emit = (socket: Socket, event: string, data: unknown): Promise<Ack> =>
  new Promise((resolve, reject) => {
    socket
      .timeout(5000)
      .emit(event, data, (error: Error | null, ack: Ack) => (error ? reject(error) : resolve(ack)));
  });
const connect = (url: string, token?: string): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = io(url, {
      transports: ['websocket'],
      auth: token ? { token } : {},
      forceNew: true,
      reconnection: false,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
const nextEvent = (socket: Socket, event: string): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, 5000);
    const handler = (data: Record<string, unknown>) => {
      clearTimeout(timer);
      resolve(data);
    };
    socket.once(event, handler);
  });

describe('Native MySQL spatial + HTTP + Socket.io', () => {
  let app: INestApplication;
  let db: DataSource;
  let url: string;
  let adminToken: string;
  let token: string;
  let driverId: string;
  let lineId: string;
  let sockets: Socket[] = [];
  const plate = 'ABC-1D23';
  const missing = '00000000-0000-4000-8000-000000000000';
  const gps = () => ({
    licensePlate: plate,
    busLineId: lineId,
    position: [-43.37, -21.77],
    speed: 20,
    headingTowards: 90,
    timestamp: new Date().toISOString(),
  });

  beforeAll(async () => {
    // This suite clears its own disposable test database, never a development database.
    const name = process.env.DATABASE_URL
      ? new URL(process.env.DATABASE_URL).pathname.slice(1)
      : process.env.DATABASE_NAME;
    if (process.env.ALLOW_INTEGRATION_DB_RESET !== 'true' || !name?.endsWith('_test'))
      throw new Error(
        'Integration tests require DATABASE_NAME ending in _test and ALLOW_INTEGRATION_DB_RESET=true',
      );
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    db = app.get(DataSource);
    for (const table of [
      'forum_answers',
      'forum_posts',
      'campus_places',
      'bus_locations',
      'driver_sessions',
      'bus_stops',
      'bus_lines',
      'license_plates',
      'users',
    ])
      await db.query(`DELETE FROM ${table}`);
    await db.query(
      `INSERT INTO users(id,registration_number,password_hash,user_type_id,is_active)
      VALUES (?,'admin',?,(SELECT id FROM user_types WHERE name='admin'),true)`,
      [randomUUID(), await bcrypt.hash('admin-password123', 4)],
    );
    adminToken = (
      await request(url)
        .post('/auth/login')
        .send({ registrationNumber: 'admin', password: 'admin-password123' })
        .expect(201)
    ).body.token;
    driverId = (
      await request(url)
        .post('/auth/register')
        .send({
          registrationNumber: 'driver',
          password: 'driver-password123',
          passwordConfirmation: 'driver-password123',
        })
        .expect(201)
    ).body.id;
    await request(url)
      .post('/auth/login')
      .send({ registrationNumber: 'driver', password: 'driver-password123' })
      .expect(401);
    await request(url)
      .patch(`/admin/users/${driverId}/activation`)
      .auth(adminToken, { type: 'bearer' })
      .send({ isActive: true })
      .expect(200);
    token = (
      await request(url).post('/auth/login').auth('driver', 'driver-password123').expect(201)
    ).body.token;
    lineId = (
      await request(url)
        .post('/bus-lines')
        .auth(adminToken, { type: 'bearer' })
        .send({ code: 'C1', name: 'Circular 1' })
        .expect(201)
    ).body.id;
    await request(url)
      .post('/license-plates')
      .auth(adminToken, { type: 'bearer' })
      .send({ licensePlate: plate })
      .expect(201);
  });
  afterEach(async () => {
    sockets.forEach((socket) => socket.close());
    sockets = [];
    if (db && driverId) {
      await app
        .get(TelemetryService)
        .close({ id: driverId, registrationNumber: 'driver', userType: 'driver' }, plate);
    }
  });
  afterAll(async () => {
    if (app) await app.close();
    else if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('enforces JWT, role and activation on HTTP', async () => {
    await request(url)
      .post('/bus-lines')
      .auth(adminToken, { type: 'bearer' })
      .send({ code: 'NULL', name: 'Invalid flag', isActive: null })
      .expect(400);
    await request(url)
      .post('/forum/posts')
      .auth(token, { type: 'bearer' })
      .send({ title: 'Invalid flag', content: 'Text', is_anonymous: null })
      .expect(400);
    await request(url).post('/bus-lines').send({ code: 'x', name: 'x' }).expect(401);
    await request(url)
      .post('/bus-lines')
      .auth(token, { type: 'bearer' })
      .send({ code: 'x', name: 'x' })
      .expect(403);
    await request(url)
      .patch(`/admin/users/${missing}/activation`)
      .auth(adminToken, { type: 'bearer' })
      .send({ isActive: true })
      .expect(404);
    await request(url)
      .post('/auth/register')
      .send({
        registrationNumber: 'attacker',
        password: 'password123',
        passwordConfirmation: 'password123',
        userType: 'admin',
      })
      .expect(400);
  });
  it('stores MySQL geographic coordinates and broadcasts only to matching rooms', async () => {
    const driver = await connect(url, token);
    const passenger = await connect(url);
    const specific = await connect(url);
    const other = await connect(url);
    sockets.push(driver, passenger, specific, other);
    expect((await emit(passenger, 'passenger:subscribe', {})).ok).toBe(true);
    await emit(specific, 'passenger:subscribe', { busLineId: lineId });
    await emit(other, 'passenger:subscribe', { busLineId: missing });
    const wrong = jest.fn();
    other.on('passenger:location-update', wrong);
    const anonymous = await emit(passenger, 'driver:start-session', {
      licensePlate: plate,
      busLineId: lineId,
    });
    expect(anonymous.error?.status).toBe(401);
    expect(
      (await emit(driver, 'driver:start-session', { licensePlate: plate, busLineId: lineId })).ok,
    ).toBe(true);
    const sample = gps();
    const publicEvent = nextEvent(passenger, 'passenger:location-update');
    const lineEvent = nextEvent(specific, 'passenger:location-update');
    expect((await emit(driver, 'driver:send-location', sample)).ok).toBe(true);
    expect(await publicEvent).toMatchObject({ licensePlate: plate, position: [-43.37, -21.77] });
    expect(await lineEvent).toMatchObject({ licensePlate: plate });
    expect(wrong).not.toHaveBeenCalled();
    const [row] = await db.query(
      'SELECT ST_Longitude(location) AS lng,ST_Latitude(location) AS lat,ST_SRID(location) AS srid FROM bus_locations WHERE license_plate=?',
      [plate],
    );
    expect({ ...row, srid: Number(row.srid) }).toEqual({ lng: -43.37, lat: -21.77, srid: 4326 });
    expect((await emit(driver, 'driver:send-location', sample)).error?.status).toBe(409);
    expect(
      (await emit(driver, 'driver:send-location', { ...gps(), speed: 81 })).error?.status,
    ).toBe(400);
    const stolen = await connect(url, token);
    sockets.push(stolen);
    expect((await emit(stolen, 'driver:heartbeat', { licensePlate: plate })).error?.status).toBe(
      403,
    );
    expect((await emit(driver, 'driver:heartbeat', { licensePlate: plate })).ok).toBe(true);
    expect((await request(url).get('/bus-location').expect(200)).body[plate].position).toEqual([
      -43.37, -21.77,
    ]);
    const offline = nextEvent(passenger, 'passenger:bus-offline');
    expect((await emit(driver, 'driver:close-session', { licensePlate: plate })).ok).toBe(true);
    expect(await offline).toMatchObject({ busStatus: 'notCirculating', reason: 'closed' });
    expect((await request(url).get('/bus-location')).body).toEqual({});
  });
  it('enforces authorized fleet and exclusive sessions under concurrency', async () => {
    await request(url)
      .post('/bus-location/sessions')
      .auth(token, { type: 'bearer' })
      .send({ licensePlate: 'ZZZ-9999', busLineId: lineId })
      .expect(403);
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(url)
          .post('/bus-location/sessions')
          .auth(token, { type: 'bearer' })
          .send({ licensePlate: plate, busLineId: lineId }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    await request(url)
      .post(`/bus-location/${plate}/close`)
      .auth(token, { type: 'bearer' })
      .expect(201);
  });
  it('renews a stationary session by heartbeat without inventing new GPS samples', async () => {
    await request(url)
      .post('/bus-location/sessions')
      .auth(token, { type: 'bearer' })
      .send({ licensePlate: plate, busLineId: lineId })
      .expect(201);
    const { licensePlate, ...body } = gps();
    await request(url)
      .post(`/bus-location/${licensePlate}`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    await db.query(
      'UPDATE driver_sessions SET last_seen_at=TIMESTAMPADD(SECOND,-25,UTC_TIMESTAMP(3)) WHERE active_vehicle=?',
      [plate],
    );
    await request(url)
      .post(`/bus-location/${plate}/heartbeat`)
      .auth(token, { type: 'bearer' })
      .expect(201);
    await app.get(TelemetryService).expireSessions();
    expect((await request(url).get('/bus-location').expect(200)).body[plate]).toMatchObject({
      busStatus: 'circulating',
      position: [-43.37, -21.77],
    });
    const [count] = await db.query(
      'SELECT COUNT(*) AS total FROM bus_locations WHERE session_id=(SELECT id FROM driver_sessions WHERE active_vehicle=?)',
      [plate],
    );
    expect(Number(count.total)).toBe(1);
  });
  it('does not revive an expired lease even before the scheduled expiry monitor closes it', async () => {
    await request(url)
      .post('/bus-location/sessions')
      .auth(token, { type: 'bearer' })
      .send({ licensePlate: plate, busLineId: lineId })
      .expect(201);
    await db.query(
      'UPDATE driver_sessions SET last_seen_at=TIMESTAMPADD(SECOND,-31,UTC_TIMESTAMP(3)) WHERE active_vehicle=?',
      [plate],
    );
    await request(url)
      .post(`/bus-location/${plate}/heartbeat`)
      .auth(token, { type: 'bearer' })
      .expect(409);
    const { licensePlate, ...body } = gps();
    await request(url)
      .post(`/bus-location/${licensePlate}`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(409);
  });
  it('hides and expires a revoked vehicle even when its last heartbeat is fresh', async () => {
    const passenger = await connect(url);
    sockets.push(passenger);
    await emit(passenger, 'passenger:subscribe', {});
    await request(url)
      .post('/bus-location/sessions')
      .auth(token, { type: 'bearer' })
      .send({ licensePlate: plate, busLineId: lineId })
      .expect(201);
    const { licensePlate, ...body } = gps();
    await request(url)
      .post(`/bus-location/${licensePlate}`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    const offline = nextEvent(passenger, 'passenger:bus-offline');
    try {
      await db.query('UPDATE license_plates SET is_active=false WHERE plate=?', [plate]);
      expect((await request(url).get('/bus-location').expect(200)).body).toEqual({});
      const heartbeat = await request(url)
        .post(`/bus-location/${plate}/heartbeat`)
        .auth(token, { type: 'bearer' });
      // The scheduled monitor may have already closed the revoked session.
      expect([403, 409]).toContain(heartbeat.status);
      await app.get(TelemetryService).expireSessions();
      expect(await offline).toMatchObject({ licensePlate: plate, reason: 'authorization-revoked' });
    } finally {
      await db.query('UPDATE license_plates SET is_active=true WHERE plate=?', [plate]);
    }
  });
  it('expires a lost connection from durable last_seen and persists offline status', async () => {
    const passenger = await connect(url);
    sockets.push(passenger);
    await emit(passenger, 'passenger:subscribe', {});
    await request(url)
      .post('/bus-location/sessions')
      .auth(token, { type: 'bearer' })
      .send({ licensePlate: plate, busLineId: lineId })
      .expect(201);
    const { licensePlate, ...body } = gps();
    await request(url)
      .post(`/bus-location/${licensePlate}`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    const offline = nextEvent(passenger, 'passenger:bus-offline');
    await db.query(
      `UPDATE driver_sessions SET last_seen_at=TIMESTAMPADD(SECOND,-31,UTC_TIMESTAMP(3)) WHERE license_plate=? AND closed_at IS NULL`,
      [plate],
    );
    await app.get(TelemetryService).expireSessions();
    expect(await offline).toMatchObject({ reason: 'timeout' });
    expect((await request(url).get('/bus-location')).body).toEqual({});
    const [row] = await db.query(
      'SELECT bus_status FROM bus_locations WHERE license_plate=? ORDER BY timestamp DESC LIMIT 1',
      [plate],
    );
    expect(row.bus_status).toBe('notCirculating');
    await request(url)
      .post(`/bus-location/${plate}/heartbeat`)
      .auth(token, { type: 'bearer' })
      .expect(409);
  });
  it('finds nearby stops/places in meters, ordered by distance', async () => {
    for (const [name, position] of [
      ['Near', [-43.37, -21.77]],
      ['Far', [-43.37, -21.771]],
      ['Outside', [-43.37, -21.79]],
    ] as const) {
      await request(url)
        .post('/bus-stops')
        .auth(adminToken, { type: 'bearer' })
        .send({ shortName: name, longName: name, position })
        .expect(201);
    }
    const response = await request(url)
      .get('/bus-stops/nearest?lat=-21.77&lng=-43.37&radius=500')
      .expect(200);
    expect(response.body.map((s: { shortName: string }) => s.shortName)).toEqual(['Near', 'Far']);
    expect(response.body[1].distanceMeters).toBeGreaterThan(100);
    await request(url).get('/bus-stops/nearest?lat=-21.77&lng=-43.37&radius=999999').expect(400);
    await request(url)
      .post('/campus-places')
      .auth(adminToken, { type: 'bearer' })
      .send({ name: 'RU', category: 'food', position: [-43.37, -21.77] })
      .expect(201);
    expect(
      (await request(url).get('/campus-places/nearest?lat=-21.77&lng=-43.37')).body[0].name,
    ).toBe('RU');
  });
  it('keeps anonymous authors private in posts and answers', async () => {
    const post = (
      await request(url)
        .post('/forum/posts')
        .auth(token, { type: 'bearer' })
        .send({ title: 'Question', content: 'Where?', is_anonymous: true })
        .expect(201)
    ).body;
    expect(post.author).toBeNull();
    expect(post).not.toHaveProperty('author_id');
    await request(url)
      .post(`/forum/posts/${post.id}/answers`)
      .auth(token, { type: 'bearer' })
      .send({ content: 'Here', is_anonymous: true })
      .expect(201);
    const posts = (await request(url).get('/forum/posts').expect(200)).body;
    expect(posts[0].author).toBeNull();
    expect(posts[0].answers[0].author).toBeNull();
    expect(JSON.stringify(posts)).not.toContain(driverId);
    await request(url)
      .post(`/forum/posts/${missing}/answers`)
      .auth(token, { type: 'bearer' })
      .send({ content: 'Missing' })
      .expect(404);
  });
  it('revokes an existing JWT immediately when the user is deactivated', async () => {
    await request(url)
      .patch(`/admin/users/${driverId}/activation`)
      .auth(adminToken, { type: 'bearer' })
      .send({ isActive: false })
      .expect(200);
    await request(url)
      .post('/forum/posts')
      .auth(token, { type: 'bearer' })
      .send({ title: 'Q', content: 'Q' })
      .expect(401);
    const driver = await connect(url, token);
    sockets.push(driver);
    expect(
      (await emit(driver, 'driver:start-session', { licensePlate: plate, busLineId: lineId })).error
        ?.status,
    ).toBe(401);
  });
});
