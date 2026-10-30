import { MigrationInterface, QueryRunner } from 'typeorm';
export class CircularRoutes1793577600000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE bus_line_stops DROP INDEX line_stop_unique, ADD UNIQUE KEY line_stop_unique(bus_line_id,bus_stop_id,stop_sequence)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    const rows = await q.query(
      'SELECT bus_line_id FROM bus_line_stops GROUP BY bus_line_id,bus_stop_id HAVING COUNT(*)>1 LIMIT 1',
    );
    if (rows.length) throw new Error('Remove repeated stops before reverting circular routes');
    await q.query(
      'ALTER TABLE bus_line_stops DROP INDEX line_stop_unique, ADD UNIQUE KEY line_stop_unique(bus_line_id,bus_stop_id)',
    );
  }
}
