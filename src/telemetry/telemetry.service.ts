import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
import { AuthUser } from '../auth/auth.service';
import { mysqlCode, pointSql, pointWkt } from '../database/mysql';
import { LocationDto, StartSessionDto } from './telemetry.dto';
import { BusOffline, LocationUpdate, TelemetryEvents } from './telemetry.events';
interface SessionRow {
  id: string;
  driver_id: string;
  license_plate: string;
  bus_line_id: string;
  socket_id: string | null;
  last_sample_at: Date | null;
  last_seen_at: Date;
  closed_at: Date | null;
}
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private expiring = false;
  constructor(
    private readonly db: DataSource,
    private readonly events: TelemetryEvents,
  ) {}
  private async authorize(tx: EntityManager, user: AuthUser, plate: string, line?: string) {
    const users: { id: string }[] = await tx.query(
      `SELECT u.id FROM users u JOIN user_types t ON t.id=u.user_type_id WHERE u.id=? AND u.is_active AND t.name IN ('driver','admin') FOR SHARE`,
      [user.id],
    );
    if (!users.length) throw new ForbiddenException('Active driver/admin required');
    const plates: { id: string }[] = await tx.query(
      'SELECT id FROM license_plates WHERE plate=? AND is_active FOR SHARE',
      [plate],
    );
    if (!plates.length) throw new ForbiddenException('Vehicle not authorized');
    if (line) {
      const lines: { id: string }[] = await tx.query(
        'SELECT id FROM bus_lines WHERE id=? AND is_active FOR SHARE',
        [line],
      );
      if (!lines.length) throw new BadRequestException('Unknown or inactive bus line');
    }
  }
  async start(user: AuthUser, dto: StartSessionDto, socketId?: string) {
    await this.expireSessions();
    try {
      return await this.db.transaction('READ COMMITTED', async (tx) => {
        await this.authorize(tx, user, dto.licensePlate, dto.busLineId);
        const id = randomUUID();
        await tx.query(
          'INSERT INTO driver_sessions(id,driver_id,license_plate,bus_line_id,socket_id) VALUES (?,?,?,?,?)',
          [id, user.id, dto.licensePlate, dto.busLineId, socketId ?? null],
        );
        return { sessionId: id, ...dto, expiresAfterSeconds: 30 };
      });
    } catch (error) {
      if (mysqlCode(error) === 'ER_DUP_ENTRY')
        throw new ConflictException(
          'Vehicle or driver already has an active session; close it or wait for expiry',
        );
      throw error;
    }
  }
  private async ownedSession(
    tx: EntityManager,
    user: AuthUser,
    plate: string,
    socketId?: string,
  ): Promise<SessionRow> {
    // Read the clock in a new statement after acquiring the lock; NOW is statement-scoped in MySQL.
    const [row]: SessionRow[] = await tx.query(
      'SELECT * FROM driver_sessions WHERE active_vehicle=? FOR UPDATE',
      [plate],
    );
    if (!row) throw new ConflictException('No active session; start a new session');
    const [lease]: { active: number | string }[] = await tx.query(
      'SELECT last_seen_at>TIMESTAMPADD(SECOND,-30,UTC_TIMESTAMP(3)) AS active FROM driver_sessions WHERE id=?',
      [row.id],
    );
    // mysql2 can return SQL comparison expressions as "0"/"1" (BIGINT).
    if (Number(lease.active) !== 1)
      throw new ConflictException('No active session; start a new session');
    if (row.driver_id !== user.id || (socketId !== undefined && row.socket_id !== socketId))
      throw new ForbiddenException('This client does not own the vehicle session');
    await this.authorize(tx, user, plate, row.bus_line_id);
    return row;
  }
  async ingest(user: AuthUser, dto: LocationDto, socketId?: string): Promise<LocationUpdate> {
    const [lng, lat] = dto.position;
    if (lng < -43.4 || lng > -43.3 || lat < -21.8 || lat > -21.7)
      throw new BadRequestException(
        'GPS outside the UFJF/Juiz de Fora bounding box; position must be [lng, lat]',
      );
    const sample = new Date(dto.timestamp);
    const delta = Date.now() - sample.getTime();
    if (
      !Number.isFinite(delta) ||
      delta < -5000 ||
      delta > 30000 ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(dto.timestamp)
    )
      throw new BadRequestException(
        'Timestamp must include timezone and be between 30s old and 5s in the future',
      );
    const update = await this.db.transaction('READ COMMITTED', async (tx) => {
      const session = await this.ownedSession(tx, user, dto.licensePlate, socketId);
      if (session.bus_line_id !== dto.busLineId)
        throw new ConflictException('Bus line differs from session');
      if (session.last_sample_at && sample.getTime() <= new Date(session.last_sample_at).getTime())
        throw new ConflictException('Out-of-order or duplicate sample');
      await tx.query(
        `INSERT INTO bus_locations(id,session_id,license_plate,bus_line_id,driver_id,bus_status,location,speed,heading_towards,timestamp) VALUES (?,?,?,?,?,'circulating',${pointSql},?,?,?)`,
        [
          randomUUID(),
          session.id,
          dto.licensePlate,
          dto.busLineId,
          user.id,
          pointWkt(dto.position),
          dto.speed,
          dto.headingTowards,
          sample,
        ],
      );
      await tx.query(
        'UPDATE driver_sessions SET last_seen_at=UTC_TIMESTAMP(3),last_sample_at=? WHERE id=?',
        [sample, session.id],
      );
      return {
        licensePlate: dto.licensePlate,
        busLineId: dto.busLineId,
        busStatus: 'circulating' as const,
        position: dto.position,
        speed: dto.speed,
        headingTowards: dto.headingTowards,
        timestamp: sample.toISOString(),
      };
    });
    // Broadcast only after the transaction has committed.
    this.events.emit({ name: 'passenger:location-update', data: update });
    return update;
  }
  async heartbeat(user: AuthUser, plate: string, socketId?: string) {
    await this.db.transaction('READ COMMITTED', async (tx) => {
      const session = await this.ownedSession(tx, user, plate, socketId);
      await tx.query('UPDATE driver_sessions SET last_seen_at=UTC_TIMESTAMP(3) WHERE id=?', [
        session.id,
      ]);
    });
    return { licensePlate: plate, expiresAfterSeconds: 30 };
  }
  private async closeRow(tx: EntityManager, session: SessionRow) {
    await tx.query('UPDATE driver_sessions SET closed_at=UTC_TIMESTAMP(3) WHERE id=?', [
      session.id,
    ]);
    // Insert a new offline sample; use a derived source to avoid MySQL's self-select LIMIT restrictions.
    await tx.query(
      `INSERT INTO bus_locations(id,session_id,license_plate,bus_line_id,driver_id,bus_status,location,speed,heading_towards,timestamp)
      SELECT ?,session_id,license_plate,bus_line_id,driver_id,'notCirculating',location,0,heading_towards,
      GREATEST(UTC_TIMESTAMP(3),TIMESTAMPADD(MICROSECOND,1000,timestamp)) FROM
      (SELECT * FROM bus_locations WHERE session_id=? ORDER BY timestamp DESC LIMIT 1) latest`,
      [randomUUID(), session.id],
    );
  }
  async close(user: AuthUser, plate: string, socketId?: string) {
    const event = await this.db.transaction('READ COMMITTED', async (tx) => {
      const [row]: SessionRow[] = await tx.query(
        'SELECT * FROM driver_sessions WHERE active_vehicle=? FOR UPDATE',
        [plate],
      );
      if (!row) return null;
      if (row.driver_id !== user.id || (socketId !== undefined && row.socket_id !== socketId))
        throw new ForbiddenException('Session belongs to another client');
      await this.closeRow(tx, row);
      return {
        licensePlate: plate,
        busLineId: row.bus_line_id,
        busStatus: 'notCirculating' as const,
        reason: 'closed' as const,
      };
    });
    if (event) this.events.emit({ name: 'passenger:bus-offline', data: event });
    return { licensePlate: plate, busStatus: 'notCirculating' };
  }
  @Interval(1000)
  async expireSessions(): Promise<void> {
    if (this.expiring) return;
    this.expiring = true;
    try {
      const offline = await this.db.transaction('READ COMMITTED', async (tx) => {
        const rows: (SessionRow & { timed_out: number | string })[] =
          await tx.query(`SELECT s.*,(s.last_seen_at<=TIMESTAMPADD(SECOND,-30,UTC_TIMESTAMP(3))) AS timed_out
          FROM driver_sessions s JOIN users u ON u.id=s.driver_id JOIN user_types t ON t.id=u.user_type_id
          JOIN license_plates p ON p.plate=s.license_plate JOIN bus_lines l ON l.id=s.bus_line_id
          WHERE s.closed_at IS NULL AND (s.last_seen_at<=TIMESTAMPADD(SECOND,-30,UTC_TIMESTAMP(3))
          OR NOT u.is_active OR t.name NOT IN ('driver','admin') OR NOT p.is_active OR NOT l.is_active)
          FOR UPDATE OF s SKIP LOCKED`);
        const result: BusOffline[] = [];
        for (const row of rows) {
          await this.closeRow(tx, row);
          result.push({
            licensePlate: row.license_plate,
            busLineId: row.bus_line_id,
            busStatus: 'notCirculating',
            reason: Number(row.timed_out) === 1 ? 'timeout' : 'authorization-revoked',
          });
        }
        return result;
      });
      offline.forEach((data) => this.events.emit({ name: 'passenger:bus-offline', data }));
    } catch (error) {
      this.logger.error(
        'Failed to expire driver sessions',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.expiring = false;
    }
  }
  async current(busLineId?: string): Promise<Record<string, LocationUpdate>> {
    const rows: {
      license_plate: string;
      bus_line_id: string;
      lng: number;
      lat: number;
      speed: string;
      heading_towards: string;
      timestamp: Date;
    }[] = await this.db.query(
      `
      SELECT s.license_plate,s.bus_line_id,ST_Longitude(b.location) AS lng,ST_Latitude(b.location) AS lat,b.speed,b.heading_towards,b.timestamp
      FROM driver_sessions s JOIN users u ON u.id=s.driver_id JOIN user_types t ON t.id=u.user_type_id
      JOIN license_plates p ON p.plate=s.license_plate JOIN bus_lines l ON l.id=s.bus_line_id
      JOIN bus_locations b ON b.id=(SELECT id FROM bus_locations WHERE session_id=s.id ORDER BY timestamp DESC LIMIT 1)
      WHERE s.closed_at IS NULL AND s.last_seen_at>TIMESTAMPADD(SECOND,-30,UTC_TIMESTAMP(3))
      AND u.is_active AND t.name IN ('driver','admin') AND p.is_active AND l.is_active AND b.bus_status='circulating'
      AND (? IS NULL OR s.bus_line_id=?)`,
      [busLineId ?? null, busLineId ?? null],
    );
    return Object.fromEntries(
      rows.map((row) => [
        row.license_plate,
        {
          licensePlate: row.license_plate,
          busLineId: row.bus_line_id,
          busStatus: 'circulating',
          position: [Number(row.lng), Number(row.lat)],
          speed: Number(row.speed),
          headingTowards: Number(row.heading_towards),
          timestamp: new Date(row.timestamp).toISOString(),
        },
      ]),
    );
  }
}
