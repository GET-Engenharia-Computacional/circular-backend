type Position = [number, number];
export async function simulationRoute(apiUrl: string, lineId?: string, lineCode?: string) {
  async function json(url: string): Promise<any> {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.message || `HTTP ${response.status} ao carregar a rota.`);
    return body;
  }
  if (lineCode || !lineId) {
    const lines: { id: string; code: string; isActive: boolean }[] = await json(
      apiUrl + '/bus-lines',
    );
    const code = (lineCode || '03').replace(/^0+/, '');
    const matches = lines.filter((line) => line.isActive && line.code.replace(/^0+/, '') === code);
    if (matches.length !== 1)
      throw new Error(
        'Não foi encontrada uma única linha ativa com esse código. Confira o cadastro.',
      );
    lineId = matches[0].id;
  }
  const route = await json(apiUrl + '/bus-lines/' + encodeURIComponent(lineId!) + '/geometry');
  if (
    !Array.isArray(route.coordinates) ||
    route.coordinates.length < 2 ||
    route.coordinates.some(
      (p: unknown) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        !p.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
        Math.abs(p[0]) > 180 ||
        Math.abs(p[1]) > 90,
    )
  )
    throw new Error('O roteador não retornou um traçado válido pelas vias.');
  return { busLineId: lineId!, path: route.coordinates as Position[] };
}

// Resume near the last simulated location instead of jumping to the first stop.
export function resumeSimulationPath(path: Position[], position?: Position): Position[] {
  if (!position || path.length < 2) return path;
  const closed = path[0][0] === path[path.length - 1][0] && path[0][1] === path[path.length - 1][1];
  const points = closed ? path.slice(0, -1) : path;
  const scale = Math.cos((position[1] * Math.PI) / 180);
  let nearest = 0,
    best = Infinity;
  points.forEach((point, index) => {
    const distance = ((point[0] - position[0]) * scale) ** 2 + (point[1] - position[1]) ** 2;
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  return closed
    ? [...points.slice(nearest), ...points.slice(0, nearest + 1)]
    : points.slice(Math.min(nearest, points.length - 2));
}
