import { resumeSimulationPath, simulationRoute } from '../src/simulation-route';
const coordinates: [number, number][] = [
  [-43.37, -21.77],
  [-43.371, -21.772],
  [-43.375, -21.779],
  [-43.37, -21.77],
];
describe('Line simulator route', () => {
  afterEach(() => jest.restoreAllMocks());
  it('defaults to the updated Circular line 03 and uses the same geometry as passengers', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json([
          { id: 'line1', code: '01', isActive: true },
          { id: 'circular', code: '03', isActive: true },
        ]),
      )
      .mockResolvedValueOnce(Response.json({ coordinates }));
    expect(await simulationRoute('http://localhost:3000')).toEqual({
      busLineId: 'circular',
      path: coordinates,
    });
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:3000/bus-lines/circular/geometry');
  });
  it('honors a requested code instead of a stale ID', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json([{ id: 'line1', code: '01', isActive: true }]))
      .mockResolvedValueOnce(Response.json({ coordinates }));
    expect((await simulationRoute('http://api', 'stale', '1')).busLineId).toBe('line1');
  });
  it('reloads the latest registered geometry for the same line', async () => {
    const changed = [coordinates[0], coordinates[2], coordinates[0]];
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ coordinates }))
      .mockResolvedValueOnce(Response.json({ coordinates: changed }));
    expect((await simulationRoute('http://api', 'circular')).path).toEqual(coordinates);
    expect((await simulationRoute('http://api', 'circular')).path).toEqual(changed);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('fails before opening a trip when routing is unavailable', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ message: 'Roteador indisponível' }, { status: 503 }));
    await expect(simulationRoute('http://api', 'line1')).rejects.toThrow('Roteador indisponível');
  });
  it.each([
    { points: [] },
    { points: [[1]] },
    {
      points: [
        [181, 0],
        [1, 1],
      ],
    },
    {
      points: [
        [1, 1],
        ['bad', 2],
      ],
    },
  ])('rejects invalid geometry %j', async ({ points }) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ coordinates: points }));
    await expect(simulationRoute('http://api', 'line1')).rejects.toThrow('traçado válido');
  });
  it('resumes a revised closed route nearby and preserves the registered direction', () => {
    expect(resumeSimulationPath(coordinates, coordinates[1])).toEqual([
      coordinates[1],
      coordinates[2],
      coordinates[0],
      coordinates[1],
    ]);
    expect(resumeSimulationPath(coordinates)).toBe(coordinates);
  });
});
