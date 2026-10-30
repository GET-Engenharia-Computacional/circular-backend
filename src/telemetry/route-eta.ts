import { RouteStop } from '../catalog/route';
type Point = [number, number]; // [lat, lng]
const rad = Math.PI / 180;
function distance(a: Point, b: Point) {
  const h =
    Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(((b[1] - a[1]) * rad) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
interface RouteEtaResult {
  minutes: number;
  meters: number;
  stopSequence: number;
  isAdjusted?: boolean;
  nearestStopId?: string;
}
// Project onto the nearest directed segment. Heading resolves ties at shared vertices.
// Open routes stop at their end; closed circuits continue into the next lap.
export function routeEta(
  stops: RouteStop[],
  position: Point,
  speed: number,
  heading: number,
  stopId: string,
): RouteEtaResult | null {
  if ((distanceFromRoute(stops, position) ?? 0) > 100) {
    // Re-anchor to a real active stop, never a synthetic road vertex.
    const nearest = stops
      .filter((stop) => stop.busStopId)
      .reduce<RouteStop | undefined>((best, stop) => {
        const point: Point = [stop.position[1], stop.position[0]];
        return !best ||
          distance(position, point) < distance(position, [best.position[1], best.position[0]])
          ? stop
          : best;
      }, undefined);
    if (!nearest) return null;
    const anchor: Point = [nearest.position[1], nearest.position[0]];
    const onward = routeEta(stops, anchor, speed, heading, stopId);
    if (!onward) return null;
    const meters = onward.meters + distance(position, anchor);
    return {
      ...onward,
      meters: Math.round(meters),
      minutes: Math.ceil(meters / (((speed >= 5 ? speed : 20) * 1000) / 60)),
      isAdjusted: true,
      nearestStopId: nearest.busStopId,
    };
  }
  const route = stops.map((stop) => ({
    ...stop,
    position: [stop.position[1], stop.position[0]] as Point,
  }));
  if (route.length < 2) return null;
  let best: { score: number; index: number; remaining: number } | undefined;
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i].position,
      b = route[i + 1].position;
    const scale = Math.cos(position[0] * rad);
    const x = (b[1] - a[1]) * scale,
      y = b[0] - a[0];
    if (x * x + y * y === 0) continue;
    const t = Math.max(
      0,
      Math.min(1, ((position[1] - a[1]) * scale * x + (position[0] - a[0]) * y) / (x * x + y * y)),
    );
    const projected: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
    const bearing = (Math.atan2(x, y) / rad + 360) % 360;
    const angle = Math.abs(((bearing - heading + 540) % 360) - 180);
    const score = distance(position, projected) + angle / 180;
    if (!best || score < best.score) best = { score, index: i, remaining: distance(projected, b) };
  }
  if (!best) return null;
  let meters = best.remaining;
  const start = route[best.index];
  if (start.busStopId === stopId && distance(position, start.position) < 2)
    return { minutes: 0, meters: 0, stopSequence: start.stopSequence };
  // A closed circuit may reach a stop again on the next lap.
  if (route[0].busStopId === route[route.length - 1].busStopId) route.push(...route.slice(1));
  for (let j = best.index + 1; j < route.length; j++) {
    if (route[j].busStopId === stopId)
      return {
        minutes: Math.ceil(meters / (((speed >= 5 ? speed : 20) * 1000) / 60)),
        meters: Math.round(meters),
        stopSequence: start.stopSequence,
      };
    if (j + 1 < route.length) meters += distance(route[j].position, route[j + 1].position);
  }
  return null;
}

export function distanceFromRoute(stops: RouteStop[], position: Point): number | null {
  if (stops.length < 2) return null;
  let nearest = Infinity;
  for (let i = 1; i < stops.length; i++) {
    const a: Point = [stops[i - 1].position[1], stops[i - 1].position[0]],
      b: Point = [stops[i].position[1], stops[i].position[0]];
    const scale = Math.cos(position[0] * rad),
      x = (b[1] - a[1]) * scale,
      y = b[0] - a[0],
      length = x * x + y * y;
    const t = length
      ? Math.max(
          0,
          Math.min(1, ((position[1] - a[1]) * scale * x + (position[0] - a[0]) * y) / length),
        )
      : 0;
    nearest = Math.min(
      nearest,
      distance(position, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]),
    );
  }
  return nearest;
}
