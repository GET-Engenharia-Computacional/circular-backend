import { DataSource } from 'typeorm';
import { loadRouteGeometry } from '../src/catalog/route-geometry';
import { distanceFromRoute, routeEta } from '../src/telemetry/route-eta';
const a = [-43.37, -21.78],
  bend = [-43.37, -21.775],
  b = [-43.36, -21.775];
const db = (suffix: string) =>
  ({
    query: jest.fn().mockResolvedValue([
      { busStopId: 'a' + suffix, stopSequence: 1, lng: a[0], lat: a[1] },
      { busStopId: 'b' + suffix, stopSequence: 2, lng: b[0], lat: b[1] },
    ]),
  }) as unknown as DataSource;
const step = (coordinates: number[][]) => ({ geometry: { type: 'LineString', coordinates } });
const response = () => ({
  ok: true,
  json: async () => ({
    code: 'Ok',
    routes: [
      { legs: [{ steps: [step([a, bend]), step([bend, b])] }, { steps: [step([b, bend, a])] }] },
    ],
  }),
});
afterEach(() => jest.restoreAllMocks());
it('shares the curved closed geometry, retaining repeated stop boundaries and caching provider requests', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(response() as Response);
  const source = db('curved');
  const route = await loadRouteGeometry(source, 'line');
  expect(route.map((p) => p.position)).toEqual([a, bend, b, bend, a]);
  expect(route.filter((p) => p.busStopId).map((p) => p.busStopId)).toEqual([
    'acurved',
    'bcurved',
    'acurved',
  ]);
  expect(distanceFromRoute(route, [-21.775, -43.365])).toBe(0);
  expect(routeEta(route, [-21.775, -43.365], 20, 90, 'bcurved')).not.toBeNull();
  expect(routeEta(route, [-21.772, -43.365], 20, 90, 'bcurved')).toMatchObject({
    isAdjusted: true,
  });
  expect(await loadRouteGeometry(source, 'line')).toEqual(route);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain('steps=true');
});
it('invalidates geometry when the ordered stops change', async () => {
  const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(response() as Response);
  await loadRouteGeometry(db('before'), 'line');
  await loadRouteGeometry(db('after'), 'line');
  expect(fetch).toHaveBeenCalledTimes(2);
});
it.each(['network', 'invalid', 'disconnected'])(
  'does not substitute straight lines when routing is %s',
  async (mode) => {
    const result = response();
    if (mode === 'invalid') result.json = async () => ({ code: 'NoRoute', routes: [] });
    if (mode === 'disconnected')
      result.json = async () => ({
        code: 'Ok',
        routes: [{ legs: [{ steps: [step([a, b])] }, { steps: [step([bend, a])] }] }],
      });
    const fetch = jest.spyOn(global, 'fetch');
    if (mode === 'network') fetch.mockRejectedValue(new Error('offline'));
    else fetch.mockResolvedValue(result as Response);
    await expect(loadRouteGeometry(db(mode), 'line')).rejects.toMatchObject({
      status: mode === 'invalid' ? 422 : 503,
    });
  },
);

it('accepts sub-meter gaps between OSRM legs and closes quantized endpoints exactly', async () => {
  const shiftedB = [b[0] + 0.000001, b[1] + 0.000001];
  const shiftedA = [a[0] + 0.000001, a[1] + 0.000001];
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      code: 'Ok',
      routes: [
        {
          legs: [{ steps: [step([a, bend, b])] }, { steps: [step([shiftedB, bend, shiftedA])] }],
        },
      ],
    }),
  } as Response);
  const route = await loadRouteGeometry(db('quantized'), 'line');
  expect(route[route.length - 1].position).toEqual(route[0].position);
  expect(route.map((point) => point.busStopId).filter(Boolean)).toEqual([
    'aquantized',
    'bquantized',
    'aquantized',
  ]);
});

it('retries one transient network failure without changing the requested itinerary', async () => {
  const fetch = jest
    .spyOn(global, 'fetch')
    .mockRejectedValueOnce(new Error('network timeout'))
    .mockResolvedValueOnce(response() as Response);
  const route = await loadRouteGeometry(db('retry-network'), 'line');
  expect(route.map((point) => point.position)).toEqual([a, bend, b, bend, a]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][0]).toBe(fetch.mock.calls[1][0]);
});
