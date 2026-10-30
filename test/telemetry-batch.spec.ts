jest.mock('../src/catalog/route-geometry', () => ({
  loadRouteGeometry: (db: unknown, id: string) =>
    jest.requireActual('../src/catalog/route').loadRoute(db, id),
}));
import { ValidationPipe } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TelemetryService } from '../src/telemetry/telemetry.service';
import { TelemetryEvents } from '../src/telemetry/telemetry.events';
import { BatchLocationDto } from '../src/telemetry/telemetry.dto';
import { AuthUser } from '../src/auth/auth.service';

describe('Buffered telemetry transactions', () => {
  const user: AuthUser = { id: 'driver', registrationNumber: '123', userType: 'driver' };
  let query: jest.Mock,
    service: TelemetryService,
    events: TelemetryEvents,
    session: Record<string, unknown>;
  const record = (offset = 0) => ({
    position: [-43.37, -21.77] as [number, number],
    speed: 20,
    headingTowards: 90,
    timestamp: new Date(Date.now() - offset).toISOString(),
  });
  const batch = (): BatchLocationDto => ({
    licensePlate: 'ABC-1D23',
    busLineId: 'line',
    sessionId: 'session',
    records: [record(2000), record(1000)],
  });
  beforeEach(() => {
    session = {
      id: 'session',
      driver_id: user.id,
      license_plate: 'ABC-1D23',
      bus_line_id: 'line',
      socket_id: 'socket',
      last_sample_at: null,
      started_at: new Date(Date.now() - 3600000),
    };
    query = jest.fn(async (sql: string) =>
      sql.startsWith('SELECT * FROM driver_sessions')
        ? [session]
        : sql.includes(' AS active FROM driver_sessions')
          ? [{ active: 1 }]
          : [{ id: 'authorized' }],
    );
    const db = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(async (_: string, callback: (tx: EntityManager) => Promise<unknown>) =>
        callback({ query } as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    events = new TelemetryEvents();
    service = new TelemetryService(db, events);
  });
  it('preserves timestamps and broadcasts only the newest committed sample from an unordered batch', async () => {
    const dto = batch();
    dto.records.reverse();
    const emit = jest.spyOn(events, 'emit');
    expect(await service.syncBatch(user, dto, 'socket')).toEqual({ accepted: 2 });
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO bus_locations'))!;
    expect(
      insert[1]
        .filter((value: unknown) => value instanceof Date)
        .map((value: Date) => value.toISOString()),
    ).toEqual([...dto.records].reverse().map((r) => r.timestamp));
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({
      name: 'passenger:location-update',
      data: { timestamp: dto.records[0].timestamp },
    });
    expect(insert[0]).toContain('ON DUPLICATE KEY UPDATE');
  });
  it('accepts old historical samples without broadcasting or rewriting their capture time', async () => {
    const emit = jest.spyOn(events, 'emit'),
      dto = { ...batch(), records: [record(3600000)] };
    await service.syncBatch(user, dto, 'socket');
    expect(emit).not.toHaveBeenCalled();
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO bus_locations'))!;
    expect(insert[1]).toContainEqual(new Date(dto.records[0].timestamp));
  });
  it('never rewinds a newer live position on a retry or an older batch', async () => {
    session.last_sample_at = new Date();
    const emit = jest.spyOn(events, 'emit');
    await service.syncBatch(user, batch(), 'socket');
    expect(emit).not.toHaveBeenCalled();
  });
  it('requires active session ownership and the matching line', async () => {
    await expect(service.syncBatch(user, batch(), 'other-socket')).rejects.toThrow('does not own');
    await expect(
      service.syncBatch(user, { ...batch(), busLineId: 'other-line' }, 'socket'),
    ).rejects.toThrow('differs');
    query.mockImplementation(async (sql: string) =>
      sql.startsWith('SELECT * FROM driver_sessions')
        ? [session]
        : sql.includes(' AS active FROM driver_sessions')
          ? [{ active: 0 }]
          : [{ id: 'authorized' }],
    );
    await expect(service.syncBatch(user, batch(), 'socket')).rejects.toThrow('No active session');
  });
  it('rejects another driver original session', async () => {
    query.mockImplementation(async (sql: string) =>
      sql.includes('WHERE id=? FOR UPDATE')
        ? [{ ...session, id: 'old', driver_id: 'other' }]
        : sql.startsWith('SELECT * FROM driver_sessions')
          ? [session]
          : sql.includes(' AS active FROM driver_sessions')
            ? [{ active: 1 }]
            : [{ id: 'authorized' }],
    );
    await expect(
      service.syncBatch(user, { ...batch(), sessionId: 'old' }, 'socket'),
    ).rejects.toThrow('does not belong');
  });
  it('keeps confirmed history on its original closed session without reviving it', async () => {
    query.mockImplementation(async (sql: string) =>
      sql.includes('WHERE id=? FOR UPDATE')
        ? [{ ...session, id: 'old', closed_at: new Date() }]
        : sql.startsWith('SELECT * FROM driver_sessions')
          ? [session]
          : sql.includes(' AS active FROM driver_sessions')
            ? [{ active: 1 }]
            : [{ id: 'authorized' }],
    );
    const emit = jest.spyOn(events, 'emit');
    await service.syncBatch(user, { ...batch(), sessionId: 'old' }, 'socket');
    expect(emit).not.toHaveBeenCalled();
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO bus_locations'))!;
    expect(insert[1][1]).toBe('old');
  });
  it('does not publish if the transaction fails', async () => {
    const original = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO bus_locations')) throw new Error('database failure');
      return original(sql);
    });
    const emit = jest.spyOn(events, 'emit');
    await expect(service.syncBatch(user, batch(), 'socket')).rejects.toThrow('database failure');
    expect(emit).not.toHaveBeenCalled();
  });
  it('rejects invalid nested samples, empty and oversized batches', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const dto = { licensePlate: 'ABC-1D23', records: [record()] };
    for (const records of [
      [],
      Array.from({ length: 51 }, () => record()),
      [{ ...record(), speed: 81 }],
      [{ ...record(), position: ['bad', 0] }],
    ])
      await expect(
        pipe.transform({ ...dto, records }, { type: 'body', metatype: BatchLocationDto }),
      ).rejects.toThrow();
    await expect(
      service.syncBatch(
        user,
        { ...batch(), records: [{ ...record(), position: [-21.77, -43.37] }] },
        'socket',
      ),
    ).rejects.toThrow('bounding box');
    await expect(
      service.syncBatch(user, { ...batch(), records: [record(-6000)] }, 'socket'),
    ).rejects.toThrow('Timestamp');
  });
});
