import 'reflect-metadata';
import { ValidationPipe, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { RolesGuard } from '../src/auth/guards';
import { AdminBusStopsController } from '../src/catalog/AdminBusStopsController';
import { AdminBusLinesController } from '../src/catalog/AdminBusLinesController';
import { TelemetryEvents } from '../src/telemetry/telemetry.events';
import { AdminRoutesService } from '../src/catalog/admin-routes.service';
import { PatchStopDto, RouteEntryDto } from '../src/catalog/admin.dto';
import { BusStopsService } from '../src/catalog/bus-stops.service';

describe('admin route and stop boundaries', () => {
  const line = '74da64c4-b72a-42f9-a762-51c4fa61e253';
  const stop = '74da64c4-b72a-42f9-a762-51c4fa61e254';
  let query: jest.Mock, service: AdminRoutesService, db: DataSource;
  beforeEach(() => {
    query = jest.fn().mockResolvedValue([{ id: stop }]);
    db = {
      query,
      transaction: jest.fn(async (callback) => callback({ query })),
    } as unknown as DataSource;
    service = new AdminRoutesService(db);
  });
  it.each([AdminBusStopsController, AdminBusLinesController])(
    'requires admin role on %p',
    (controller) => {
      const guard = new RolesGuard(new Reflector());
      for (const userType of ['driver', 'passenger', undefined, 'admin']) {
        const context = {
          getClass: () => controller,
          getHandler: () => () => {},
          switchToHttp: () => ({
            getRequest: () => ({ user: userType ? { userType } : undefined }),
          }),
        } as unknown as ExecutionContext;
        expect(guard.canActivate(context)).toBe(userType === 'admin');
      }
    },
  );
  it('writes valid coordinates with explicit long-lat axis order and SRID', async () => {
    const stops = new BusStopsService(db);
    await stops.create({
      shortName: 'RU',
      longName: 'Restaurante',
      position: [-43.37, -21.77],
      isActive: true,
    });
    expect(query.mock.calls[0][0]).toContain("ST_GeomFromText(?,4326,'axis-order=long-lat')");
    expect(query.mock.calls[0][1]).toContain('POINT(-43.37 -21.77)');
    await expect(
      stops.create({ shortName: 'RU', longName: 'RU', position: [-181, 0], isActive: true }),
    ).rejects.toThrow();
  });
  it('accepts partial status updates and rejects invalid coordinates before SQL', async () => {
    query.mockResolvedValue([
      { id: stop, shortName: 'RU', longName: 'RU', lng: -43.37, lat: -21.77, isActive: 1 },
    ]);
    expect(await service.patchStop(stop, { isActive: false })).toMatchObject({
      id: stop,
      isActive: false,
      position: [-43.37, -21.77],
    });
    await expect(service.patchStop(stop, { position: [0, 91] })).rejects.toThrow();
  });
  it('blocks deletion when any active line references the stop', async () => {
    await expect(service.deleteStop(stop)).rejects.toMatchObject({ status: 400 });
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  });
  it('accepts repeated stops and rejects non-contiguous sequences', async () => {
    await service.saveRoute(line, [
      { busStopId: stop, stopSequence: 1 },
      { busStopId: stop, stopSequence: 2 },
    ]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    await expect(service.saveRoute(line, [{ busStopId: stop, stopSequence: 2 }])).rejects.toThrow();
  });
  it('notifies passengers only after the transaction commits', async () => {
    const events = new TelemetryEvents(),
      emit = jest.spyOn(events, 'emit');
    service = new AdminRoutesService(db, events);
    await service.saveRoute(line, []);
    expect(emit).toHaveBeenCalledWith({
      name: 'passenger:route-updated',
      data: { busLineId: line },
    });
    emit.mockClear();
    (db.transaction as jest.Mock).mockRejectedValueOnce(new Error('rollback'));
    await expect(service.saveRoute(line, [])).rejects.toThrow('rollback');
    expect(emit).not.toHaveBeenCalled();
  });
  it('sorts and replaces route entries inside one transaction', async () => {
    await service.saveRoute(line, [
      { busStopId: 'b', stopSequence: 2 },
      { busStopId: 'a', stopSequence: 1, estimatedMinutesFromPrevious: 3 },
    ]);
    const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO bus_line_stops'));
    expect(inserts.map(([, params]) => params)).toEqual([
      [line, 'a', 1, 3],
      [line, 'b', 2, null],
    ]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed patch and ordering values', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    for (const body of [
      { position: [0] },
      { position: [NaN, 0] },
      { isActive: 'false' },
      { longName: '  ' },
    ])
      await expect(
        pipe.transform(body, { type: 'body', metatype: PatchStopDto }),
      ).rejects.toThrow();
    await expect(
      pipe.transform(
        { busStopId: stop, stopSequence: 1, estimatedMinutesFromPrevious: -1 },
        { type: 'body', metatype: RouteEntryDto },
      ),
    ).rejects.toThrow();
  });
});
