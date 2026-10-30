import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { hash } from 'bcrypt';
import { DatabaseModule } from '../../src/database/database.module';
import { CatalogModule } from '../../src/catalog/catalog.module';

// Creates and cleans only its own UUID fixtures. Never resets the development DB.
describe('Module 2.2: MySQL spatial and admin HTTP', () => {
  let app: INestApplication, db: DataSource;
  const users = [randomUUID(), randomUUID(), randomUUID()];
  const tokens: Record<string, string> = {};
  const stops: string[] = [];
  const places: string[] = [];
  let lineId: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, CatalogModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    db = app.get(DataSource);
    await db.runMigrations();
    const jwt = app.get(JwtService);
    for (const [i, role] of ['admin', 'driver', 'passenger'].entries()) {
      await db.query(
        `INSERT INTO users(id,user_type_id,registration_number,password_hash,is_active)
        VALUES (?,(SELECT id FROM user_types WHERE name=?),?,?,true)`,
        [users[i], role, `test-${users[i]}`, await hash('test-admin-password', 4)],
      );
      tokens[role] = await jwt.signAsync({ sub: users[i] });
    }
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      if (lineId) {
        await db.query('DELETE FROM bus_line_stops WHERE bus_line_id=?', [lineId]);
        await db.query('DELETE FROM bus_lines WHERE id=?', [lineId]);
      }
      for (const id of stops) await db.query('DELETE FROM bus_stops WHERE id=?', [id]);
      for (const id of places) await db.query('DELETE FROM campus_places WHERE id=?', [id]);
      for (const id of users) await db.query('DELETE FROM users WHERE id=?', [id]);
    }
    if (app) await app.close();
  });
  const body = {
    shortName: 'Teste',
    longName: 'Parada de teste M2.2',
    position: [-43.37, -21.77],
    isActive: true,
  };
  it('protects place, stop and line administration with admin JWTs', async () => {
    const http = app.getHttpServer();
    const endpoints: [string, string][] = [
      ['get', '/admin/campus-places'],
      ['post', '/admin/campus-places'],
      ['patch', `/admin/campus-places/${users[0]}`],
      ['delete', `/admin/campus-places/${users[0]}`],
      ['post', '/admin/bus-stops'],
      ['post', '/admin/bus-lines'],
    ];
    for (const [method, path] of endpoints) {
      for (const role of [undefined, 'driver', 'passenger']) {
        const agent = request(http);
        const call =
          method === 'get'
            ? agent.get(path)
            : method === 'post'
              ? agent.post(path)
              : method === 'patch'
                ? agent.patch(path)
                : agent.delete(path);
        if (role) call.auth(tokens[role], { type: 'bearer' });
        await call.send({}).expect(role ? 403 : 401);
      }
    }
  });
  it('creates, edits and inactivates places with spatial integrity and plain text', async () => {
    const http = app.getHttpServer(),
      auth = { type: 'bearer' as const };
    const input = {
      name: ` Biblioteca ${randomUUID().slice(0, 8)} `,
      category: 'Biblioteca',
      description: 'Texto\u0000 seguro',
      position: [-43.37, -21.77],
    };
    const created = (
      await request(http)
        .post('/admin/campus-places')
        .auth(tokens.admin, auth)
        .send(input)
        .expect(201)
    ).body;
    places.push(created.id);
    expect(created.name).toBe(input.name.trim());
    expect(created.description).toBe('Texto seguro');
    const [point] = await db.query(
      'SELECT ST_Longitude(location) AS lng,ST_Latitude(location) AS lat,ST_SRID(location) AS srid FROM campus_places WHERE id=?',
      [created.id],
    );
    expect([Number(point.lng), Number(point.lat), Number(point.srid)]).toEqual([
      -43.37, -21.77, 4326,
    ]);
    await request(http)
      .patch(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .send({ position: [-43.375, -21.775], category: 'Secretaria', description: null })
      .expect(200);
    expect(
      (
        await request(http)
          .get('/admin/campus-places?limit=100')
          .auth(tokens.admin, auth)
          .expect(200)
      ).body.items,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          category: 'Secretaria',
          description: null,
          position: [-43.375, -21.775],
        }),
      ]),
    );
    for (const payload of [
      { ...input, position: [-43.41, -21.77] },
      { ...input, name: '<script>alert(1)</script>' },
    ])
      await request(http)
        .post('/admin/campus-places')
        .auth(tokens.admin, auth)
        .send(payload)
        .expect(400);
    await request(http)
      .patch(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .send({ description: '<img src=x onerror=alert(1)>' })
      .expect(400);
    await request(http)
      .patch(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .send({ isActive: false })
      .expect(200);
    expect(
      (await request(http).get('/campus-places?limit=100').expect(200)).body.some(
        (place: { id: string }) => place.id === created.id,
      ),
    ).toBe(false);
    const nearby = (
      await request(http)
        .get('/campus-places/nearest?lng=-43.375&lat=-21.775&radius=100')
        .expect(200)
    ).body;
    expect(nearby.some((place: { id: string }) => place.id === created.id)).toBe(false);
    expect(
      (
        await request(http)
          .get('/admin/campus-places?limit=100')
          .auth(tokens.admin, auth)
          .expect(200)
      ).body.items,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id, isActive: false })]),
    );
    await request(http)
      .patch(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .send({ isActive: true })
      .expect(200);
    await request(http)
      .delete(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .expect(400);
    await request(http)
      .delete(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .send({ password: 'wrong' })
      .expect(400);
    await request(http)
      .delete(`/admin/campus-places/${created.id}`)
      .auth(tokens.admin, auth)
      .send({ password: 'test-admin-password' })
      .expect(200);
    expect(await db.query('SELECT id FROM campus_places WHERE id=?', [created.id])).toHaveLength(0);
  });
  it('rejects missing/invalid JWT and driver/passenger roles on every admin operation', async () => {
    const http = app.getHttpServer();
    await request(http).post('/admin/bus-stops').send(body).expect(401);
    await request(http)
      .post('/admin/bus-stops')
      .auth('invalid', { type: 'bearer' })
      .send(body)
      .expect(401);
    for (const role of ['driver', 'passenger']) {
      const routes: [string, string, unknown][] = [
        ['post', '/admin/bus-stops', body],
        ['patch', `/admin/bus-stops/${users[0]}`, { isActive: false }],
        ['delete', `/admin/bus-stops/${users[0]}`, {}],
        ['post', '/admin/bus-lines', { code: 'T', name: 'Test' }],
        ['post', `/admin/bus-lines/${users[0]}/stops`, []],
        ['patch', `/admin/users/${users[1]}/activation`, { isActive: false }],
        ['post', '/license-plates', { licensePlate: 'TST-1A23' }],
      ];
      for (const [method, path, data] of routes) {
        const agent = request(http);
        const call =
          method === 'post'
            ? agent.post(path)
            : method === 'patch'
              ? agent.patch(path)
              : agent.delete(path);
        await call
          .auth(tokens[role], { type: 'bearer' })
          .send(data as object)
          .expect(403);
      }
    }
  });
  it('creates spatial stops, saves and reorders atomically, omits inactive stops publicly', async () => {
    const http = app.getHttpServer();
    const auth = { type: 'bearer' as const };
    for (const [index, position] of [
      [-43.37, -21.77],
      [-43.371, -21.771],
    ].entries()) {
      const result = await request(http)
        .post('/admin/bus-stops')
        .auth(tokens.admin, auth)
        .send({ ...body, shortName: `T${index}`, position })
        .expect(201);
      stops.push(result.body.id);
    }
    const [point] = await db.query(
      'SELECT ST_Longitude(location) AS lng,ST_Latitude(location) AS lat,ST_SRID(location) AS srid FROM bus_stops WHERE id=?',
      [stops[0]],
    );
    expect([Number(point.lng), Number(point.lat), Number(point.srid)]).toEqual([
      -43.37, -21.77, 4326,
    ]);
    await request(http)
      .post('/admin/bus-stops')
      .auth(tokens.admin, auth)
      .send({ ...body, position: [0, 91] })
      .expect(400);
    lineId = (
      await request(http)
        .post('/admin/bus-lines')
        .auth(tokens.admin, auth)
        .send({ code: `T${randomUUID().slice(0, 12)}`, name: 'Linha teste M2.2', isActive: true })
        .expect(201)
    ).body.id;
    await request(http)
      .post(`/admin/bus-lines/${lineId}/stops`)
      .auth(tokens.admin, auth)
      .send(stops.map((busStopId, i) => ({ busStopId, stopSequence: i + 1 })))
      .expect(201);
    await request(http)
      .post(`/admin/bus-lines/${lineId}/stops`)
      .auth(tokens.admin, auth)
      .send([
        { busStopId: stops[0], stopSequence: 2, estimatedMinutesFromPrevious: 4 },
        { busStopId: stops[1], stopSequence: 1 },
      ])
      .expect(201);
    const route = (await request(http).get(`/bus-lines/${lineId}/route`).expect(200)).body;
    expect(route.map((s: { busStopId: string }) => s.busStopId)).toEqual([
      stops[1],
      stops[0],
      stops[1],
    ]);
    expect(route[0].position).toEqual([-43.371, -21.771]);
    await request(http)
      .delete(`/admin/bus-stops/${stops[0]}`)
      .auth(tokens.admin, auth)
      .send({ password: 'test-admin-password' })
      .expect(400);
    await request(http)
      .post(`/admin/bus-lines/${lineId}/stops`)
      .auth(tokens.admin, auth)
      .send([
        { busStopId: stops[0], stopSequence: 1 },
        { busStopId: stops[1], stopSequence: 2 },
        { busStopId: stops[0], stopSequence: 3 },
      ])
      .expect(201);
    expect(
      (await request(http).get(`/bus-lines/${lineId}/route`).expect(200)).body.map(
        (s: { busStopId: string }) => s.busStopId,
      ),
    ).toEqual([stops[0], stops[1], stops[0]]);
    await request(http)
      .post(`/admin/bus-lines/${lineId}/stops`)
      .auth(tokens.admin, auth)
      .send([
        { busStopId: stops[1], stopSequence: 1 },
        { busStopId: stops[0], stopSequence: 2 },
      ])
      .expect(201);
    await request(http)
      .post(`/admin/bus-lines/${lineId}/stops`)
      .auth(tokens.admin, auth)
      .send([{ busStopId: randomUUID(), stopSequence: 1 }])
      .expect(400);
    expect((await request(http).get(`/bus-lines/${lineId}/route`).expect(200)).body).toEqual(route);
    await request(http)
      .patch(`/admin/bus-stops/${stops[1]}`)
      .auth(tokens.admin, auth)
      .send({ isActive: false })
      .expect(200);
    expect((await request(http).get(`/bus-lines/${lineId}/route`).expect(200)).body).toHaveLength(
      1,
    );
    expect(
      (
        await request(http)
          .get(`/admin/bus-lines/${lineId}/stops`)
          .auth(tokens.admin, auth)
          .expect(200)
      ).body,
    ).toHaveLength(2);
    await request(http)
      .post('/admin/bus-lines')
      .auth(tokens.admin, auth)
      .send({ id: lineId, code: `T${lineId.slice(0, 12)}`, name: 'Inativa', isActive: false })
      .expect(201);
    await request(http)
      .delete(`/admin/bus-stops/${stops[0]}`)
      .auth(tokens.admin, auth)
      .send({ password: 'test-admin-password' })
      .expect(400);
    await request(http)
      .post(`/admin/bus-lines/${lineId}/stops`)
      .auth(tokens.admin, auth)
      .send([])
      .expect(201);
    await request(http)
      .delete(`/admin/bus-stops/${stops[0]}`)
      .auth(tokens.admin, auth)
      .send({ password: 'test-admin-password' })
      .expect(200);
    await request(http).delete(`/admin/bus-lines/${lineId}`).auth(tokens.admin, auth).expect(400);
    await request(http)
      .delete(`/admin/bus-lines/${lineId}`)
      .auth(tokens.admin, auth)
      .send({ password: 'test-admin-password' })
      .expect(200);
  });
});
