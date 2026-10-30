import { previewRoadRoute } from '../src/catalog/road-route';
import { geometryForStops } from '../src/catalog/route-geometry';
jest.mock('../src/catalog/route-geometry', () => ({ geometryForStops: jest.fn() }));
afterEach(() => jest.clearAllMocks());
it('retains point order and a repeated first stop in a circular preview', async () => {
  jest.mocked(geometryForStops).mockImplementation(async (stops) => stops);
  const result = await previewRoadRoute('-43.37,-21.77;-43.38,-21.78;-43.37,-21.77');
  expect(result.coordinates).toEqual([
    [-43.37, -21.77],
    [-43.38, -21.78],
    [-43.37, -21.77],
  ]);
  const stops = jest.mocked(geometryForStops).mock.calls[0][0];
  expect(stops[2].busStopId).toBe(stops[0].busStopId);
});
it('rejects invalid bounds, malformed coordinates and oversized requests before routing', async () => {
  for (const value of [
    undefined,
    [],
    'bad;coordinates',
    '1,2;3,4',
    '-43.37,-21.77',
    ';',
    'x'.repeat(6001),
  ])
    await expect(previewRoadRoute(value)).rejects.toMatchObject({ status: 400 });
  expect(geometryForStops).not.toHaveBeenCalled();
});
it('warns when street snapping moves a stop more than 50m', async () => {
  jest.mocked(geometryForStops).mockResolvedValue([
    { busStopId: '0', stopSequence: 1, position: [-43.368263, -21.774327] },
    { busStopId: '1', stopSequence: 2, position: [-43.375181, -21.779016] },
  ]);
  expect((await previewRoadRoute('-43.369,-21.775;-43.3752,-21.779')).warning).toContain(
    'parada 1: 107 m',
  );
});
