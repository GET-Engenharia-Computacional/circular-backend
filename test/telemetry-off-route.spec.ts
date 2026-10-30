jest.mock('../src/catalog/route-geometry', () => ({
  loadRouteGeometry: (db: unknown, id: string) =>
    jest.requireActual('../src/catalog/route').loadRoute(db, id),
}));
import { DataSource } from 'typeorm';
import { TelemetryService } from '../src/telemetry/telemetry.service';
import { TelemetryEvents } from '../src/telemetry/telemetry.events';

it('suspends arrivals while off route and restores them on return without hiding the bus', async () => {
  let lat = -21.782;
  const query = jest.fn(async (sql: string) =>
    sql.includes('FROM bus_line_stops')
      ? [
          { busStopId: 'a', stopSequence: 1, lng: -43.37, lat: -21.78 },
          { busStopId: 'b', stopSequence: 2, lng: -43.36, lat: -21.78 },
        ]
      : [
          {
            license_plate: 'ABC-1234',
            bus_line_id: 'line',
            lng: -43.365,
            lat,
            speed: '20',
            heading_towards: '90',
            timestamp: new Date(),
          },
        ],
  );
  const service = new TelemetryService({ query } as unknown as DataSource, new TelemetryEvents());
  const off = await service.arrivals('b');
  expect(off[0]).toMatchObject({
    minutes: null,
    meters: null,
    status: 'Ônibus em desvio de rota',
    bus: { is_off_route: true, position: [-43.365, lat] },
  });
  lat = -21.7801;
  const back = await service.arrivals('b');
  expect(back[0].bus.is_off_route).toBe(false);
  expect(back[0].minutes).toBeGreaterThan(0);
});
