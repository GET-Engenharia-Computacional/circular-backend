import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import { campusPlaces } from './campus-places';
import { pointSql, pointWkt } from './mysql';

export function campusPlaceId(key: string) {
  const h = createHash('sha256').update(`localizaufjf:campus:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function importCampusPlaces(db: DataSource, dryRun = false) {
  return db.transaction(async (tx) => {
    let inserted = 0;
    const plan = [];
    for (const place of campusPlaces) {
      const id = campusPlaceId(place.key);
      const existing = await tx.query('SELECT id FROM campus_places WHERE id=? OR name=?', [
        id,
        place.name,
      ]);
      const action = existing.length ? 'preserve-existing' : 'insert';
      plan.push({ ...place, id, action });
      if (!existing.length && !dryRun) {
        await tx.query(
          `INSERT INTO campus_places(id,name,category,description,location) VALUES (?,?,?,?,${pointSql})`,
          [id, place.name, place.category, place.description, pointWkt([...place.position])],
        );
        inserted++;
      }
    }
    return { dryRun, inserted, plan };
  });
}
