import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NearbyQuery, PageQuery } from '../common/dto';
import { pointSql, pointWkt, spatialResult, SpatialRow } from '../database/mysql';
import { PlaceDto } from './catalog.dto';
import { PatchPlaceDto } from './campus-places.dto';
import { campusPosition, plainText } from './catalog-input';
const fields =
  'id,name,category,description,is_active AS isActive,ST_Longitude(location) AS lng,ST_Latitude(location) AS lat';
@Injectable()
export class CampusPlacesService {
  constructor(private readonly db: DataSource) {}
  async list(q: PageQuery) {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT ${fields} FROM campus_places WHERE is_active ORDER BY name,id LIMIT ? OFFSET ?`,
      [q.limit, q.offset],
    );
    return rows.map(spatialResult);
  }
  async adminList(q: PageQuery) {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT ${fields} FROM campus_places ORDER BY name,id LIMIT ? OFFSET ?`,
      [q.limit, q.offset],
    );
    const [count] = await this.db.query('SELECT COUNT(*) AS total FROM campus_places');
    return {
      items: rows.map(spatialResult),
      total: Number(count.total),
      limit: q.limit,
      offset: q.offset,
    };
  }
  async nearest(q: NearbyQuery) {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT ${fields},ST_Distance_Sphere(location,${pointSql}) AS distanceMeters FROM campus_places WHERE is_active HAVING distanceMeters<=? ORDER BY distanceMeters,id LIMIT 100`,
      [pointWkt([q.lng, q.lat]), q.radius],
    );
    return rows.map(spatialResult);
  }
  async create(dto: PlaceDto) {
    campusPosition(dto.position);
    const place = {
      id: randomUUID(),
      name: plainText(dto.name),
      category: plainText(dto.category),
      description: dto.description == null ? null : plainText(dto.description, true),
      position: dto.position,
      isActive: dto.isActive ?? true,
    };
    await this.db.query(
      `INSERT INTO campus_places(id,name,category,description,location,is_active) VALUES (?,?,?,?,${pointSql},?)`,
      [
        place.id,
        place.name,
        place.category,
        place.description,
        pointWkt(place.position),
        place.isActive,
      ],
    );
    return place;
  }
  async patch(id: string, dto: PatchPlaceDto) {
    if (dto.position) campusPosition(dto.position);
    const name = dto.name == null ? undefined : plainText(dto.name);
    const category = dto.category == null ? undefined : plainText(dto.category);
    const description =
      dto.description == null ? dto.description : plainText(dto.description, true);
    return this.db.transaction(async (tx) => {
      const [row]: SpatialRow[] = await tx.query(
        `SELECT ${fields} FROM campus_places WHERE id=? FOR UPDATE`,
        [id],
      );
      if (!row) throw new NotFoundException('Local não encontrado.');
      const current = spatialResult(row);
      const place = {
        id,
        name: name ?? row.name,
        category: category ?? row.category,
        description: description === undefined ? row.description : description,
        position: dto.position ?? (current.position as [number, number]),
        isActive: dto.isActive ?? current.isActive,
      };
      await tx.query(
        `UPDATE campus_places SET name=?,category=?,description=?,location=${pointSql},is_active=? WHERE id=?`,
        [
          place.name,
          place.category,
          place.description,
          pointWkt(place.position),
          place.isActive,
          id,
        ],
      );
      return place;
    });
  }
  remove(id: string) {
    return this.patch(id, { isActive: false });
  }
}
