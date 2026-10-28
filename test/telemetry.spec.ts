import { DataSource, EntityManager } from 'typeorm';
import { AuthUser } from '../src/auth/auth.service';
import { TelemetryService } from '../src/telemetry/telemetry.service';
import { TelemetryEvents } from '../src/telemetry/telemetry.events';
import { LocationDto } from '../src/telemetry/telemetry.dto';

describe('Telemetry transaction rules', () => {
  const user: AuthUser = { id: 'driver', registrationNumber: '123', userType: 'driver' };
  let service: TelemetryService;
  let events: TelemetryEvents;
  let query: jest.Mock;
  let session: Record<string, unknown>;
  const sample = (): LocationDto => ({
    licensePlate: 'ABC-1234',
    busLineId: 'line',
    position: [-43.37, -21.77],
    speed: 20,
    headingTowards: 180,
    timestamp: new Date().toISOString(),
  });
  beforeEach(() => {
    session = {
      id: 'session',
      driver_id: 'driver',
      license_plate: 'ABC-1234',
      bus_line_id: 'line',
      socket_id: 'socket',
      last_sample_at: null,
    };
    query = jest.fn(async (sql: string) =>
      sql.startsWith('SELECT * FROM driver_sessions')
        ? [session]
        : sql.includes(' AS active FROM driver_sessions')
          ? [{ active: 1 }]
          : [{ id: 'authorized' }],
    );
    const manager = { query } as unknown as EntityManager;
    const db = {
      transaction: jest.fn(
        async (_isolation: string, cb: (tx: EntityManager) => Promise<unknown>) => cb(manager),
      ),
    } as unknown as DataSource;
    events = new TelemetryEvents();
    service = new TelemetryService(db, events);
  });
  it.each([
    [-21.77, -43.37],
    [-43.5, -21.77],
    [-43.37, -22],
  ])('rejects geofence violations and reversed coordinates %j', async (lng, lat) => {
    await expect(
      service.ingest(user, { ...sample(), position: [lng, lat] }, 'socket'),
    ).rejects.toThrow('bounding box');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects stale, future and timezone-less timestamps', async () => {
    for (const timestamp of [
      new Date(Date.now() - 31000).toISOString(),
      new Date(Date.now() + 6000).toISOString(),
      new Date().toISOString().slice(0, -1),
    ]) {
      await expect(service.ingest(user, { ...sample(), timestamp }, 'socket')).rejects.toThrow(
        'Timestamp',
      );
    }
  });
  it('rejects a different socket or driver and changed bus line', async () => {
    await expect(service.ingest(user, sample(), 'other-socket')).rejects.toThrow('does not own');
    await expect(
      service.ingest({ ...user, id: 'other-driver' }, sample(), 'socket'),
    ).rejects.toThrow('does not own');
    await expect(
      service.ingest(user, { ...sample(), busLineId: 'other-line' }, 'socket'),
    ).rejects.toThrow('differs');
  });
  it('rejects duplicated and older samples without persisting or broadcasting', async () => {
    session.last_sample_at = new Date();
    const emit = jest.spyOn(events, 'emit');
    await expect(
      service.ingest(
        user,
        { ...sample(), timestamp: new Date(Date.now() - 1000).toISOString() },
        'socket',
      ),
    ).rejects.toThrow('Out-of-order');
    expect(
      query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO bus_locations')),
    ).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });
  it('never emits a location if persistence fails', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM driver_sessions')) return [session];
      if (sql.includes(' AS active FROM driver_sessions')) return [{ active: 1 }];
      if (sql.includes('INSERT INTO bus_locations')) throw new Error('database unavailable');
      return [{ id: 'authorized' }];
    });
    const emit = jest.spyOn(events, 'emit');
    await expect(service.ingest(user, sample(), 'socket')).rejects.toThrow('database unavailable');
    expect(emit).not.toHaveBeenCalled();
  });
  it('broadcasts the canonical committed payload and not the driver identity', async () => {
    const emit = jest.spyOn(events, 'emit');
    const dto = sample();
    const result = await service.ingest(user, dto, 'socket');
    expect(result.position).toEqual([-43.37, -21.77]);
    expect(result).not.toHaveProperty('driver_id');
    expect(emit).toHaveBeenCalledWith({ name: 'passenger:location-update', data: result });
  });
  it('fails closed if the plate is no longer authorized', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM driver_sessions')) return [session];
      if (sql.includes(' AS active FROM driver_sessions')) return [{ active: 1 }];
      return sql.includes('FROM license_plates') ? [] : [{ id: 'authorized' }];
    });
    await expect(service.heartbeat(user, 'ABC-1234', 'socket')).rejects.toThrow('not authorized');
  });
  it.each([0, '0'])('does not renew an expired SQL lease returned as %j', async (active) => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT * FROM driver_sessions')) return [session];
      if (sql.includes(' AS active FROM driver_sessions')) return [{ active }];
      return [{ id: 'authorized' }];
    });
    await expect(service.heartbeat(user, 'ABC-1234', 'socket')).rejects.toThrow(
      'No active session',
    );
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE driver_sessions'))).toBe(
      false,
    );
  });
});
