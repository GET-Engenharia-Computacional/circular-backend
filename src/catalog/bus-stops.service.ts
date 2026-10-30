import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NearbyQuery, PageQuery } from '../common/dto';
import { legacySource, legacyStops } from '../database/legacy/bus-stops';
import { legacyStopId } from '../database/legacy/import-stops';
import { MutationResult, SpatialRow, pointSql, pointWkt, spatialResult } from '../database/mysql';
import { StopDto } from './catalog.dto';
import { campusPosition, plainText } from './catalog-input';
export const checkPosition = campusPosition;
const fields =
  'id,short_name AS shortName,long_name AS longName,is_active AS isActive,ST_Longitude(location) AS lng,ST_Latitude(location) AS lat';
@Injectable()
export class BusStopsService {
  constructor(private readonly db: DataSource) {}
  async list() {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT ${fields} FROM bus_stops ORDER BY long_name`,
    );
    return rows.map(spatialResult);
  }
  async adminList(q: PageQuery) {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT ${fields} FROM bus_stops ORDER BY long_name,id LIMIT ? OFFSET ?`,
      [q.limit, q.offset],
    );
    const [count]: { total: string | number }[] = await this.db.query(
      'SELECT COUNT(*) AS total FROM bus_stops',
    );
    return {
      total: Number(count.total),
      limit: q.limit,
      offset: q.offset,
      items: rows.map((row) => {
        const legacy = legacyStops.find(
          (stop) => row.id === legacyStopId(stop.legacyId) || row.id === stop.legacyId,
        );
        return {
          ...spatialResult(row),
          ...(legacy
            ? { legacyId: legacy.legacyId, legacyReviewNotes: legacy.reviewReasons, legacySource }
            : {}),
        };
      }),
    };
  }
  async nearest(q: NearbyQuery) {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT ${fields},ST_Distance_Sphere(location,${pointSql}) AS distanceMeters
      FROM bus_stops WHERE is_active HAVING distanceMeters<=? ORDER BY distanceMeters,id LIMIT 100`,
      [pointWkt([q.lng, q.lat]), q.radius],
    );
    return rows.map(spatialResult);
  }
  async create(dto: StopDto) {
    checkPosition(dto.position);
    dto.shortName = plainText(dto.shortName);
    dto.longName = plainText(dto.longName);
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO bus_stops(id,short_name,long_name,location,is_active) VALUES (?,?,?,${pointSql},?)`,
      [id, dto.shortName, dto.longName, pointWkt(dto.position), dto.isActive],
    );
    return { ...dto, id };
  }
  async update(id: string, dto: StopDto) {
    checkPosition(dto.position);
    dto.shortName = plainText(dto.shortName);
    dto.longName = plainText(dto.longName);
    const result: MutationResult = await this.db.query(
      `UPDATE bus_stops SET short_name=?,long_name=?,location=${pointSql},is_active=? WHERE id=?`,
      [dto.shortName, dto.longName, pointWkt(dto.position), dto.isActive, id],
    );
    if (
      !result.affectedRows &&
      !(await this.db.query('SELECT id FROM bus_stops WHERE id=?', [id])).length
    )
      return null;
    return { ...dto, id };
  }
}
