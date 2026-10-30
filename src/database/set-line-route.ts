import db from './data-source';

// Explicit ordered IDs avoid guessing a real itinerary from names or geography.
async function main() {
  const [lineId, ...stopIds] = process.argv.slice(2);
  if (!lineId || stopIds.length < 2)
    throw new Error('Usage: npm run route:set -- LINE_UUID STOP_UUID STOP_UUID ...');
  if (new Set(stopIds).size !== stopIds.length) throw new Error('Stops in a line must be unique');
  await db.initialize();
  try {
    await db.transaction(async (tx) => {
      if (
        !(await tx.query('SELECT id FROM bus_lines WHERE id=? AND is_active FOR UPDATE', [lineId]))
          .length
      )
        throw new Error('Active line not found');
      for (const id of stopIds) {
        if (
          !(await tx.query('SELECT id FROM bus_stops WHERE id=? AND is_active FOR SHARE', [id]))
            .length
        )
          throw new Error(`Active stop not found: ${id}`);
      }
      await tx.query('DELETE FROM bus_line_stops WHERE bus_line_id=?', [lineId]);
      for (const [index, id] of stopIds.entries())
        await tx.query(
          'INSERT INTO bus_line_stops(bus_line_id,bus_stop_id,stop_sequence) VALUES (?,?,?)',
          [lineId, id, index + 1],
        );
    });
    console.log('Ordered route saved');
  } finally {
    await db.destroy();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
