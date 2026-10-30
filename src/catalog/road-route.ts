import { BadRequestException } from '@nestjs/common';
import { geometryForStops } from './route-geometry';
import { RouteStop } from './route';

export async function previewRoadRoute(value: unknown) {
  if (typeof value !== 'string' || value.length > 6000)
    throw new BadRequestException('Informe de 2 a 100 paradas para calcular a rota.');
  const pairs = value.split(';');
  if (pairs.length < 2 || pairs.length > 100)
    throw new BadRequestException('Informe de 2 a 100 paradas para calcular a rota.');
  const points = pairs.map((pair) => pair.split(',').map(Number));
  if (
    points.some(
      (p, i) =>
        !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(pairs[i]) ||
        p.length !== 2 ||
        !p.every(Number.isFinite) ||
        p[0] < -43.4 ||
        p[0] > -43.3 ||
        p[1] < -21.8 ||
        p[1] > -21.7,
    )
  )
    throw new BadRequestException('Coordenadas fora da área atendida.');
  const stops: RouteStop[] = points.map((position, i) => ({
    busStopId: String(i),
    stopSequence: i + 1,
    position: position as [number, number],
  }));
  const last = stops[stops.length - 1];
  if (last.position[0] === stops[0].position[0] && last.position[1] === stops[0].position[1])
    last.busStopId = stops[0].busStopId;
  const route = await geometryForStops(stops);
  const waypoints = route.filter((point) => point.busStopId !== '');
  const distant = waypoints.flatMap((point, i) => {
    const [lng, lat] = stops[i].position;
    const meters =
      Math.hypot(
        (point.position[0] - lng) * Math.cos((lat * Math.PI) / 180),
        point.position[1] - lat,
      ) * 111195;
    return meters > 50 ? [`parada ${i + 1}: ${Math.round(meters)} m`] : [];
  });
  return {
    coordinates: route.map((point) => point.position),
    ...(distant.length
      ? {
          warning: `Traçado ajustado à via mais próxima (${distant.join('; ')}). Confira a posição das paradas.`,
        }
      : {}),
  };
}
