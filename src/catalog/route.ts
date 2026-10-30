import { DataSource } from 'typeorm';
export interface RouteStop {
  busStopId: string;
  stopSequence: number;
  position: [number, number]; // [longitude, latitude], same contract as other endpoints
}
export async function loadRoute(db: DataSource, lineId: string): Promise<RouteStop[]> {
  const rows: { busStopId: string; stopSequence: number; lat: number; lng: number }[] =
    await db.query(
      `SELECT s.id AS busStopId, r.stop_sequence AS stopSequence,
      ST_Latitude(s.location) AS lat, ST_Longitude(s.location) AS lng
      FROM bus_line_stops r JOIN bus_stops s ON s.id=r.bus_stop_id
      JOIN bus_lines l ON l.id=r.bus_line_id
      WHERE r.bus_line_id=? AND s.is_active AND l.is_active ORDER BY r.stop_sequence`,
      [lineId],
    );
  const stops: RouteStop[] = rows.map((r) => ({
    busStopId: r.busStopId,
    stopSequence: Number(r.stopSequence),
    position: [Number(r.lng), Number(r.lat)],
  }));
  if (stops.length > 1 && stops[0].busStopId !== stops[stops.length - 1].busStopId)
    stops.push({ ...stops[0], stopSequence: stops[stops.length - 1].stopSequence + 1 });
  return stops;
}
