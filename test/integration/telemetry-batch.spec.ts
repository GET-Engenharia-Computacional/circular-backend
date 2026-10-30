import 'reflect-metadata';
import { randomInt, randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { DatabaseModule } from '../../src/database/database.module';
import { TelemetryModule } from '../../src/telemetry/telemetry.module';
import { TelemetryEvents } from '../../src/telemetry/telemetry.events';

describe('Buffered telemetry: real MySQL and authenticated HTTP', () => {
  let app: INestApplication, db: DataSource, token: string, emit: jest.SpyInstance;
  const driver = randomUUID(),
    line = randomUUID(),
    session = randomUUID();
  const plate = `Z${String.fromCharCode(65 + randomInt(26), 65 + randomInt(26))}-${randomInt(10)}${String.fromCharCode(65 + randomInt(26))}${randomInt(10)}${randomInt(10)}`;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseModule, TelemetryModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    db = app.get(DataSource);
    await db.runMigrations();
    await db.query(
      `INSERT INTO users(id,user_type_id,registration_number,password_hash,is_active) VALUES (?,(SELECT id FROM user_types WHERE name='driver'),?,'unused-test-hash',true)`,
      [driver, `buf-${driver}`],
    );
    await db.query('INSERT INTO bus_lines(id,code,name) VALUES (?,?,?)', [
      line,
      `BUF${line.slice(0, 12)}`,
      'Buffer integration fixture',
    ]);
    await db.query('INSERT INTO license_plates(id,plate) VALUES (?,?)', [randomUUID(), plate]);
    await db.query(
      'INSERT INTO driver_sessions(id,driver_id,license_plate,bus_line_id,started_at) VALUES (?,?,?,?,?)',
      [session, driver, plate, line, new Date(Date.now() - 120000)],
    );
    token = await app.get(JwtService).signAsync({ sub: driver });
    emit = jest.spyOn(app.get(TelemetryEvents), 'emit');
  });
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query('DELETE FROM bus_locations WHERE session_id=?', [session]);
      await db.query('DELETE FROM driver_sessions WHERE id=?', [session]);
      await db.query('DELETE FROM license_plates WHERE plate=?', [plate]);
      await db.query('DELETE FROM bus_lines WHERE id=?', [line]);
      await db.query('DELETE FROM users WHERE id=?', [driver]);
    }
    if (app) await app.close();
  });
  it('stores old timestamps once, keeps the latest passenger position monotonic, and rejects expired sessions', async () => {
    const http = app.getHttpServer(),
      auth = { type: 'bearer' as const };
    const record = (age: number) => ({
      position: [-43.37, -21.77],
      speed: 18,
      headingTowards: 90,
      timestamp: new Date(Date.now() - age).toISOString(),
    });
    const payload = {
      licensePlate: plate,
      busLineId: line,
      sessionId: session,
      records: [record(60000), record(65000)],
    };
    await request(http).post('/bus-location/batch').send(payload).expect(401);
    await request(http)
      .post('/bus-location/batch')
      .auth(token, auth)
      .send(payload)
      .expect(201, { accepted: 2 });
    expect(emit).not.toHaveBeenCalled();
    await request(http).post('/bus-location/batch').auth(token, auth).send(payload).expect(201);
    let rows = await db.query(
      'SELECT timestamp,ST_Longitude(location) AS lng FROM bus_locations WHERE session_id=? ORDER BY timestamp',
      [session],
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r: { timestamp: Date }) => new Date(r.timestamp).toISOString())).toEqual(
      [...payload.records].reverse().map((r) => r.timestamp),
    );
    expect(Number(rows[0].lng)).toBe(-43.37);
    const fresh = { ...payload, records: [record(1500), record(500)] };
    await request(http).post('/bus-location/batch').auth(token, auth).send(fresh).expect(201);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({
      name: 'passenger:location-update',
      data: { timestamp: fresh.records[1].timestamp },
    });
    await request(http).post('/bus-location/batch').auth(token, auth).send(payload).expect(201);
    expect(emit).toHaveBeenCalledTimes(1);
    rows = await db.query('SELECT id FROM bus_locations WHERE session_id=?', [session]);
    expect(rows).toHaveLength(4);
    await db.query('UPDATE driver_sessions SET last_seen_at=? WHERE id=?', [
      new Date(Date.now() - 31000),
      session,
    ]);
    await request(http).post('/bus-location/batch').auth(token, auth).send(fresh).expect(409);
  });
});
