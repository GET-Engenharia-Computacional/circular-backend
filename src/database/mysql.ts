import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MutationResult {
  affectedRows: number;
}
export function mysqlCode(error: unknown): string | undefined {
  const e = error as { code?: string; driverError?: { code?: string } };
  return e.driverError?.code ?? e.code;
}
export async function ensureUpdated(
  db: DataSource,
  result: MutationResult,
  table: 'users' | 'bus_lines' | 'license_plates' | 'bus_stops',
  id: string,
) {
  if (result.affectedRows) return;
  const rows: { id: string }[] = await db.query(`SELECT id FROM ${table} WHERE id=?`, [id]);
  if (!rows.length) throw new NotFoundException();
}
export interface SpatialRow {
  id: string;
  lng: number;
  lat: number;
  isActive?: number | boolean;
  [key: string]: unknown;
}
export function spatialResult<T extends SpatialRow>(row: T) {
  const { lng, lat, ...rest } = row;
  return {
    ...rest,
    ...('isActive' in row ? { isActive: !!row.isActive } : {}),
    position: [Number(lng), Number(lat)],
  };
}
// Explicit long/lat WKT avoids MySQL's EPSG:4326 default latitude-first axis order.
export const pointSql = "ST_GeomFromText(?,4326,'axis-order=long-lat')";
export const pointWkt = (position: readonly [number, number]) =>
  `POINT(${position[0]} ${position[1]})`;
