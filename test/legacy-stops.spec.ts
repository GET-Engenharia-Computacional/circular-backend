import { isUUID } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import { legacyStops } from '../src/database/legacy/bus-stops';
import {
  importLegacyStops,
  legacyStopId,
  validateLegacyStop,
} from '../src/database/legacy/import-stops';

describe('Recovery of the Swift stop catalog', () => {
  let existing: { id: string; short_name: string }[];
  let writes: unknown[][];
  let db: DataSource;
  beforeEach(() => {
    existing = [];
    writes = [];
    const query = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.startsWith('SELECT')) return existing;
      writes.push(params!);
      existing.push({ id: params![0] as string, short_name: params![1] as string });
      return { affectedRows: 1 };
    });
    const tx = { query } as unknown as EntityManager;
    db = {
      transaction: async (_isolation: string, cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(tx),
    } as unknown as DataSource;
  });
  it('maps invalid legacy placeholder UUIDs to stable, editable UUIDv5 values', () => {
    const ids = legacyStops.map((stop) => legacyStopId(stop.legacyId));
    expect(new Set(ids).size).toBe(25);
    for (const id of ids) expect(isUUID(id, '5')).toBe(true);
    expect(legacyStopId(legacyStops[0].legacyId)).toBe(ids[0]);
  });
  it('rejects reversed or nonfinite source coordinates before any insert', () => {
    expect(() => validateLegacyStop({ ...legacyStops[0], position: [-21.77, -43.37] })).toThrow();
    expect(() => validateLegacyStop({ ...legacyStops[0], position: [NaN, -21.77] })).toThrow();
  });
  it('previews the import without changing the database', async () => {
    const result = await importLegacyStops(db, true);
    expect(result).toMatchObject({ inserted: 0, wouldInsert: 25, activeNew: 16, inactiveNew: 9 });
    expect(writes).toEqual([]);
  });
  it('preserves coordinates in long/lat order and quarantines disputed candidates', async () => {
    const result = await importLegacyStops(db);
    expect(result.inserted).toBe(25);
    expect(writes[0][3]).toBe('POINT(-43.36767978223414 -21.780375186922893)');
    const engineering = legacyStops.find((s) => s.shortName === 'Engenharia')!;
    expect(writes.find((row) => row[0] === legacyStopId(engineering.legacyId))![4]).toBe(false);
  });
  it('is repeatable without overwriting records or reactivating stops', async () => {
    await importLegacyStops(db);
    writes = [];
    const result = await importLegacyStops(db);
    expect(result).toMatchObject({ inserted: 0, preserved: 25 });
    expect(writes).toEqual([]);
  });
  it('preserves existing operator records matched by accent-insensitive name', async () => {
    existing = [{ id: 'operator-created', short_name: '  FARMÁCIA  ' }];
    const result = await importLegacyStops(db);
    expect(result).toMatchObject({ inserted: 24, preserved: 1 });
    expect(result.plan.find((s) => s.shortName === 'Farmacia')).toMatchObject({
      action: 'preserve-existing',
      existingId: 'operator-created',
    });
    expect(writes.some((row) => row[1] === 'Farmacia')).toBe(false);
  });
});
