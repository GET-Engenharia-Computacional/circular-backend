import { routeEta } from '../src/telemetry/route-eta';
import { loadRoute, RouteStop } from '../src/catalog/route';
import { DataSource } from 'typeorm';

const route: RouteStop[] = [
  { busStopId: 'a', stopSequence: 1, position: [-43.37, -21.78] },
  { busStopId: 'b', stopSequence: 2, position: [-43.36, -21.78] },
  { busStopId: 'c', stopSequence: 4, position: [-43.36, -21.77] },
];
describe('itinerary ETA', () => {
  it('sums remaining and future segments rather than the direct distance', () => {
    const eta = routeEta(route, [-21.78, -43.365], 20, 90, 'c')!;
    expect(eta.meters).toBeGreaterThan(1600);
    expect(eta.meters).toBeLessThan(1650);
    expect(eta.minutes).toBe(5);
    expect(eta.stopSequence).toBe(1);
  });
  it('uses 20 km/h below 5, and current speed at the threshold', () => {
    expect(routeEta(route, [-21.78, -43.37], 0, 90, 'c')).toEqual(
      routeEta(route, [-21.78, -43.37], 20, 90, 'c'),
    );
    expect(routeEta(route, [-21.78, -43.37], 5, 90, 'c')!.minutes).toBeGreaterThan(
      routeEta(route, [-21.78, -43.37], 20, 90, 'c')!.minutes,
    );
  });
  it('does not return an ETA for a passed or unrelated stop', () => {
    expect(routeEta(route, [-21.775, -43.36], 20, 0, 'a')).toBeNull();
    expect(routeEta(route, [-21.78, -43.37], 20, 90, 'missing')).toBeNull();
    expect(routeEta([], [-21.78, -43.37], 20, 90, 'a')).toBeNull();
  });
  it('handles arrival at the start and degenerate segments', () => {
    expect(routeEta(route, [-21.78, -43.37], 20, 90, 'a')!.minutes).toBe(0);
    expect(
      routeEta([route[0], { ...route[0], stopSequence: 2 }], [-21.78, -43.37], 20, 90, 'a'),
    ).toBeNull();
  });
  it('loads active stops in sequence with the API longitude-latitude coordinate order', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([{ busStopId: 'a', stopSequence: 2, lat: '-21.78', lng: '-43.37' }]);
    expect(await loadRoute({ query } as unknown as DataSource, 'line')).toEqual([
      { busStopId: 'a', stopSequence: 2, position: [-43.37, -21.78] },
    ]);
    expect(query.mock.calls[0][0]).toMatch(/s.is_active AND l.is_active ORDER BY r.stop_sequence/);
    expect(query.mock.calls[0][1]).toEqual(['line']);
  });
});

describe('route deviation', () => {
  it('suspends ETA beyond 100m and resumes on return', () => {
    expect(routeEta(route, [-21.782, -43.365], 20, 90, 'b')).toBeNull();
    expect(routeEta(route, [-21.7805, -43.365], 20, 90, 'b')).not.toBeNull();
  });
  it('closes a loaded route once while preserving explicit return stops', async () => {
    const rows = route.map((s) => ({ ...s, lng: s.position[0], lat: s.position[1] }));
    const query = jest.fn().mockResolvedValue(rows);
    const closed = await loadRoute({ query } as unknown as DataSource, 'line');
    expect(closed.map((s) => s.busStopId)).toEqual(['a', 'b', 'c', 'a']);
    query.mockResolvedValue([...rows, { ...rows[0], stopSequence: 5 }]);
    expect(await loadRoute({ query } as unknown as DataSource, 'line')).toHaveLength(4);
  });
});

it('continues a closed circuit to a stop on the next lap', () => {
  const closed = [...route, { ...route[0], stopSequence: 5 }];
  expect(routeEta(closed, [-21.775, -43.36], 20, 0, 'b')).not.toBeNull();
});
