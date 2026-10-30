import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TelemetryEvents } from '../telemetry/telemetry.events';
import { checkPosition } from './bus-stops.service';
import { PatchStopDto, RouteEntryDto } from './admin.dto';
import { pointSql, pointWkt, spatialResult, SpatialRow } from '../database/mysql';
import { plainText } from './catalog-input';

@Injectable()
export class AdminRoutesService {
  constructor(
    private readonly db: DataSource,
    private readonly events: TelemetryEvents = new TelemetryEvents(),
  ) {}
  async patchStop(id: string, dto: PatchStopDto) {
    if (dto.position) checkPosition(dto.position);
    if (dto.shortName != null) dto.shortName = plainText(dto.shortName);
    if (dto.longName != null) dto.longName = plainText(dto.longName);
    return this.db.transaction(async (tx) => {
      const [row] = await tx.query(
        `SELECT id,short_name AS shortName,long_name AS longName,
        is_active AS isActive,ST_Longitude(location) AS lng,ST_Latitude(location) AS lat
        FROM bus_stops WHERE id=? FOR UPDATE`,
        [id],
      );
      if (!row) throw new NotFoundException('Stop not found');
      const current = spatialResult(row as SpatialRow);
      await tx.query(
        `UPDATE bus_stops SET short_name=?,long_name=?,is_active=?,location=${pointSql} WHERE id=?`,
        [
          dto.shortName ?? row.shortName,
          dto.longName ?? row.longName,
          dto.isActive ?? current.isActive,
          pointWkt(dto.position ?? (current.position as [number, number])),
          id,
        ],
      );
      return { ...current, ...dto };
    });
  }
  async deleteStop(id: string) {
    return this.db.transaction(async (tx) => {
      if (!(await tx.query('SELECT id FROM bus_stops WHERE id=? FOR UPDATE', [id])).length)
        throw new NotFoundException('Stop not found');
      if (
        (
          await tx.query(
            `SELECT r.bus_line_id FROM bus_line_stops r JOIN bus_lines l ON l.id=r.bus_line_id
        WHERE r.bus_stop_id=? AND l.is_active LIMIT 1`,
            [id],
          )
        ).length
      )
        throw new BadRequestException(
          'Parada vinculada a uma linha ativa. Remova-a do itinerário antes de excluir.',
        );
      await tx.query('UPDATE bus_stops SET is_active=false WHERE id=?', [id]);
      return { id, isActive: false };
    });
  }
  async lines() {
    const rows = await this.db.query(
      'SELECT id,code,name,is_active AS isActive FROM bus_lines ORDER BY name,id',
    );
    return rows.map((r: { isActive: number }) => ({ ...r, isActive: !!r.isActive }));
  }
  async route(id: string) {
    if (!(await this.db.query('SELECT id FROM bus_lines WHERE id=?', [id])).length)
      throw new NotFoundException('Line not found');
    const rows = await this.db.query(
      `SELECT r.bus_stop_id AS busStopId,r.stop_sequence AS stopSequence,
      r.estimated_minutes_from_previous AS estimatedMinutesFromPrevious,s.short_name AS shortName,
      s.long_name AS longName,s.is_active AS isActive,ST_Longitude(s.location) AS lng,ST_Latitude(s.location) AS lat
      FROM bus_line_stops r JOIN bus_stops s ON s.id=r.bus_stop_id WHERE r.bus_line_id=? ORDER BY r.stop_sequence`,
      [id],
    );
    return rows.map((r: SpatialRow) => spatialResult(r));
  }
  async saveRoute(id: string, entries: RouteEntryDto[]) {
    const ordered = [...entries].sort((a, b) => a.stopSequence - b.stopSequence);
    if (ordered.some((s, i) => s.stopSequence !== i + 1))
      throw new BadRequestException('Sequences must be contiguous from 1');
    await this.db.transaction(async (tx: EntityManager) => {
      if (!(await tx.query('SELECT id FROM bus_lines WHERE id=? FOR UPDATE', [id])).length)
        throw new NotFoundException('Line not found');
      // Same stop locks as deletion, sorted to reduce deadlocks with concurrent editors.
      for (const stopId of ordered.map((s) => s.busStopId).sort()) {
        if (!(await tx.query('SELECT id FROM bus_stops WHERE id=? FOR SHARE', [stopId])).length)
          throw new BadRequestException(`Unknown stop: ${stopId}`);
      }
      await tx.query('DELETE FROM bus_line_stops WHERE bus_line_id=?', [id]);
      for (const entry of ordered)
        await tx.query(
          `INSERT INTO bus_line_stops(bus_line_id,bus_stop_id,stop_sequence,estimated_minutes_from_previous)
          VALUES (?,?,?,?)`,
          [id, entry.busStopId, entry.stopSequence, entry.estimatedMinutesFromPrevious ?? null],
        );
    });
    this.events.emit({ name: 'passenger:route-updated', data: { busLineId: id } });
    return this.route(id);
  }
}
