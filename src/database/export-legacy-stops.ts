import { mkdirSync, writeFileSync } from 'node:fs';
import { legacySource, legacyStops } from './legacy/bus-stops';
import { legacyStopId, validateLegacyStop } from './legacy/import-stops';
import { pointWkt } from './mysql';
const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;
const rows = legacyStops.map((stop) => {
  validateLegacyStop(stop);
  const id = legacyStopId(stop.legacyId);
  return `-- Legacy ID: ${stop.legacyId}; ${stop.reviewReasons.join(' ') || 'Preserved from legacy; no independent survey.'}
INSERT INTO bus_stops(id,short_name,long_name,location,is_active)
SELECT ${quote(id)},${quote(stop.shortName)},${quote(stop.longName)},ST_GeomFromText(${quote(pointWkt(stop.position))},4326,'axis-order=long-lat'),${stop.reviewReasons.length ? 0 : 1}
WHERE NOT EXISTS (SELECT 1 FROM bus_stops WHERE id IN (${quote(id)},${quote(stop.legacyId)}) OR LOWER(TRIM(short_name))=LOWER(${quote(stop.shortName)}));`;
});
mkdirSync('sql', { recursive: true });
writeFileSync(
  'sql/seed-legacy-stops.sql',
  `-- Recovered from ${legacySource.commit}:${legacySource.path}
-- 25 historical candidates; 16 initially active, 9 inactive for review.
-- Existing stops are preserved. Execute once at a time, in your chosen database.
START TRANSACTION;
${rows.join('\n\n')}
COMMIT;
`,
);
console.log('Generated sql/seed-legacy-stops.sql');
