import { createHash } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { legacySource, legacyStops, LegacyStop } from './bus-stops';
import { pointSql, pointWkt } from '../mysql';

// RFC 4122 UUIDv5, DNS namespace. The original all-zero-prefix IDs are not valid
// UUID versions accepted by the v2 DTOs; retain their mapping rather than reuse them.
export function legacyStopId(legacyId: string): string {
  const bytes = createHash('sha1')
    .update(Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex'))
    .update(`localizaufjf:swift:bus-stop:${legacyId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function validateLegacyStop(stop: LegacyStop) {
  const [lng, lat] = stop.position;
  if (
    !stop.shortName.trim() ||
    !stop.longName.trim() ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -43.4 ||
    lng > -43.3 ||
    lat < -21.8 ||
    lat > -21.7
  )
    throw new Error(`Invalid legacy stop: ${stop.legacyId}`);
}
interface ExistingStop {
  id: string;
  short_name: string;
}
const normalizeName = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');
export interface ImportItem {
  id: string;
  legacyId: string;
  shortName: string;
  action: 'insert' | 'preserve-existing';
  isActive: boolean;
  reviewReasons: readonly string[];
  existingId?: string;
}
export async function planLegacyStops(tx: Pick<EntityManager, 'query'>): Promise<ImportItem[]> {
  const existing: ExistingStop[] = await tx.query('SELECT id,short_name FROM bus_stops');
  return legacyStops.map((stop) => {
    validateLegacyStop(stop);
    const id = legacyStopId(stop.legacyId);
    const match = existing.find(
      (row) =>
        row.id === id ||
        row.id === stop.legacyId ||
        normalizeName(row.short_name) === normalizeName(stop.shortName),
    );
    return {
      id,
      legacyId: stop.legacyId,
      shortName: stop.shortName,
      action: match ? 'preserve-existing' : 'insert',
      isActive: stop.reviewReasons.length === 0,
      reviewReasons: stop.reviewReasons,
      ...(match ? { existingId: match.id } : {}),
    };
  });
}
export async function importLegacyStops(db: DataSource, dryRun = false) {
  return db.transaction('READ COMMITTED', async (tx) => {
    const plan = await planLegacyStops(tx);
    if (!dryRun)
      for (const item of plan) {
        if (item.action !== 'insert') continue;
        const stop = legacyStops.find((s) => s.legacyId === item.legacyId)!;
        await tx.query(
          `INSERT INTO bus_stops(id,short_name,long_name,location,is_active) VALUES (?,?,?,${pointSql},?)`,
          [item.id, stop.shortName, stop.longName, pointWkt(stop.position), item.isActive],
        );
      }
    const inserted = plan.filter((item) => item.action === 'insert');
    return {
      dryRun,
      source: legacySource,
      inserted: dryRun ? 0 : inserted.length,
      wouldInsert: inserted.length,
      preserved: plan.length - inserted.length,
      activeNew: inserted.filter((item) => item.isActive).length,
      inactiveNew: inserted.filter((item) => !item.isActive).length,
      plan,
    };
  });
}
