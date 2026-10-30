import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { loadRoute, RouteStop } from './route';

type Coordinates = [number, number];
interface Step {
  geometry: { type: string; coordinates: Coordinates[] };
}
interface RoutingResult {
  code: string;
  message?: string;
  routes?: { legs: { steps: Step[] }[] }[];
}
const cache = new Map<string, { expires: number; value: Promise<RouteStop[]> }>();
const same = (a: Coordinates, b: Coordinates) => a[0] === b[0] && a[1] === b[1];
// Adjacent OSRM legs may differ slightly after coordinate quantization/snapping.
const connected = (a: Coordinates, b: Coordinates) =>
  Math.hypot((a[0] - b[0]) * Math.cos((a[1] * Math.PI) / 180), a[1] - b[1]) * 111195 <= 2;
function validPoint(p: unknown): p is Coordinates {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 90
  );
}

// OSRM steps retain leg boundaries, including repeated stops and both travel directions.
// https://project-osrm.org/docs/v5.24.0/api/#route-service
export async function loadRouteGeometry(db: DataSource, lineId: string): Promise<RouteStop[]> {
  return geometryForStops(await loadRoute(db, lineId));
}

export async function geometryForStops(stops: RouteStop[]): Promise<RouteStop[]> {
  if (stops.length < 2) return stops;
  const origin = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
  const key = origin + JSON.stringify(stops);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = requestGeometry(origin, stops);
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  const entry = { expires: Date.now() + 15 * 60_000, value };
  cache.set(key, entry);
  // Briefly cache failures as well, without replacing the geometry with straight lines.
  void value.catch(() => {
    entry.expires = Date.now() + 2000;
  });
  return value;
}

async function requestGeometry(origin: string, stops: RouteStop[]): Promise<RouteStop[]> {
  try {
    const positions = stops.map((s) => s.position.join(',')).join(';');
    const url =
      origin +
      '/route/v1/driving/' +
      positions +
      '?overview=false&geometries=geojson&steps=true&radiuses=' +
      stops.map(() => '150').join(';');
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          await response.body?.cancel();
          response = undefined;
        } else break;
      } catch (error) {
        if (attempt === 1) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!response) throw new Error('Routing unavailable');
    const result = (await response.json()) as RoutingResult;
    if (result.code === 'NoSegment') {
      const index = /coordinate (\d+)/.exec(result.message || '');
      throw new UnprocessableEntityException({
        message: `A parada${index ? ' ' + (Number(index[1]) + 1) : ''} não possui via roteável a até 150 m. Ajuste sua posição no cadastro.`,
        code: 'NoSegment',
      });
    }
    if (result.code === 'NoRoute')
      throw new UnprocessableEntityException({
        message:
          'Não existe caminho veicular entre essas paradas nessa ordem. Revise o itinerário e os acessos das vias.',
        code: 'NoRoute',
      });
    const legs = result.routes?.[0]?.legs;
    if (
      !response.ok ||
      result.code !== 'Ok' ||
      !Array.isArray(legs) ||
      legs.length !== stops.length - 1
    )
      throw new Error('Invalid route legs');
    const route: RouteStop[] = [];
    for (let i = 0; i < legs.length; i++) {
      const points: Coordinates[] = [];
      if (!Array.isArray(legs[i].steps)) throw new Error('Missing steps');
      for (const step of legs[i].steps) {
        if (
          step.geometry?.type !== 'LineString' ||
          !Array.isArray(step.geometry.coordinates) ||
          !step.geometry.coordinates.every(validPoint)
        )
          throw new Error('Invalid geometry');
        for (const point of step.geometry.coordinates)
          if (!points.length || !same(points[points.length - 1], point)) points.push(point);
      }
      if (!points.length) throw new Error('Empty leg');
      if (!route.length) route.push({ ...stops[i], position: points[0] });
      else if (!connected(route[route.length - 1].position, points[0]))
        throw new Error('Disconnected legs');
      for (const point of points.slice(1, -1))
        route.push({ busStopId: '', stopSequence: stops[i].stopSequence, position: point });
      route.push({ ...stops[i + 1], position: points[points.length - 1] });
    }
    if (stops[0].busStopId === stops[stops.length - 1].busStopId) {
      if (!connected(route[0].position, route[route.length - 1].position))
        throw new Error('Unclosed circuit');
      route[route.length - 1].position = route[0].position;
    }
    return route;
  } catch (error) {
    if (error instanceof UnprocessableEntityException) throw error;
    throw new ServiceUnavailableException('O traçado viário está indisponível. Tente novamente.');
  }
}
