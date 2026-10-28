import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NearbyQuery, PageQuery } from '../common/dto';
import {
  MutationResult,
  SpatialRow,
  ensureUpdated,
  mysqlCode,
  pointSql,
  pointWkt,
  spatialResult,
} from '../database/mysql';
import { LineDto, PlateDto, PlaceDto } from './catalog.dto';
import { checkPosition } from './bus-stops.service';
@Injectable()
export class CatalogService {
  constructor(private readonly db: DataSource) {}
  async lines() {
    const rows = await this.db.query(
      'SELECT id,code,name,is_active AS isActive FROM bus_lines WHERE is_active ORDER BY name',
    );
    return rows.map((r: { isActive: number }) => ({ ...r, isActive: !!r.isActive }));
  }
  async plates() {
    const rows = await this.db.query(
      'SELECT id,plate AS licensePlate,is_active AS isActive FROM license_plates WHERE is_active ORDER BY plate',
    );
    return rows.map((r: { isActive: number }) => ({ ...r, isActive: !!r.isActive }));
  }
  private async unique<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      if (mysqlCode(error) === 'ER_DUP_ENTRY')
        throw new ConflictException('Code or plate already exists');
      throw error;
    }
  }
  async createLine(dto: LineDto) {
    const id = randomUUID();
    await this.unique(() =>
      this.db.query('INSERT INTO bus_lines(id,code,name,is_active) VALUES (?,?,?,?)', [
        id,
        dto.code,
        dto.name,
        dto.isActive,
      ]),
    );
    return { ...dto, id };
  }
  async updateLine(id: string, dto: LineDto) {
    const result: MutationResult = await this.unique(() =>
      this.db.query('UPDATE bus_lines SET code=?,name=?,is_active=? WHERE id=?', [
        dto.code,
        dto.name,
        dto.isActive,
        id,
      ]),
    );
    await ensureUpdated(this.db, result, 'bus_lines', id);
    return { ...dto, id };
  }
  async createPlate(dto: PlateDto) {
    const id = randomUUID();
    await this.unique(() =>
      this.db.query('INSERT INTO license_plates(id,plate,is_active) VALUES (?,?,?)', [
        id,
        dto.licensePlate,
        dto.isActive,
      ]),
    );
    return { ...dto, id };
  }
  async updatePlate(id: string, dto: PlateDto) {
    const result: MutationResult = await this.db.query(
      'UPDATE license_plates SET is_active=? WHERE id=? AND plate=?',
      [dto.isActive, id, dto.licensePlate],
    );
    if (
      !result.affectedRows &&
      !(
        await this.db.query('SELECT id FROM license_plates WHERE id=? AND plate=?', [
          id,
          dto.licensePlate,
        ])
      ).length
    )
      throw new NotFoundException('Plate not found or immutable plate changed');
    return { ...dto, id };
  }
  async deactivate(table: 'bus_lines' | 'license_plates' | 'bus_stops', id: string) {
    const result: MutationResult = await this.db.query(
      `UPDATE ${table} SET is_active=false WHERE id=?`,
      [id],
    );
    await ensureUpdated(this.db, result, table, id);
    return { id, isActive: false };
  }
  async users(q: PageQuery) {
    const rows = await this.db.query(
      `SELECT u.id,u.registration_number AS registrationNumber,u.is_active AS isActive,t.name AS userType FROM users u JOIN user_types t ON t.id=u.user_type_id ORDER BY u.created_at DESC,u.id LIMIT ? OFFSET ?`,
      [q.limit, q.offset],
    );
    return rows.map((r: { isActive: number }) => ({ ...r, isActive: !!r.isActive }));
  }
  async activate(id: string, isActive: boolean) {
    const result: MutationResult = await this.db.query('UPDATE users SET is_active=? WHERE id=?', [
      isActive,
      id,
    ]);
    await ensureUpdated(this.db, result, 'users', id);
    return { id, isActive };
  }
  async places(q: PageQuery) {
    const rows: SpatialRow[] = await this.db.query(
      'SELECT id,name,category,description,ST_Longitude(location) AS lng,ST_Latitude(location) AS lat FROM campus_places ORDER BY name,id LIMIT ? OFFSET ?',
      [q.limit, q.offset],
    );
    return rows.map(spatialResult);
  }
  async nearbyPlaces(q: NearbyQuery) {
    const rows: SpatialRow[] = await this.db.query(
      `SELECT id,name,category,description,ST_Longitude(location) AS lng,ST_Latitude(location) AS lat,
    ST_Distance_Sphere(location,${pointSql}) AS distanceMeters FROM campus_places HAVING distanceMeters<=? ORDER BY distanceMeters,id LIMIT 100`,
      [pointWkt([q.lng, q.lat]), q.radius],
    );
    return rows.map(spatialResult);
  }
  async createPlace(dto: PlaceDto) {
    checkPosition(dto.position);
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO campus_places(id,name,category,description,location) VALUES (?,?,?,?,${pointSql})`,
      [id, dto.name, dto.category, dto.description ?? null, pointWkt(dto.position)],
    );
    return { ...dto, id };
  }
}
