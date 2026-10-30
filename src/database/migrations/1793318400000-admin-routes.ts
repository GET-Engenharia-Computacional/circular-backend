import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRoutes1793318400000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const duplicates = await q.query(`SELECT bus_line_id FROM bus_line_stops
      GROUP BY bus_line_id,bus_stop_id HAVING COUNT(*)>1 LIMIT 1`);
    if (duplicates.length)
      throw new Error('Resolve repeated stops in existing itineraries before applying AdminRoutes');
    await q.query(`ALTER TABLE bus_line_stops
      ADD estimated_minutes_from_previous INT NULL CHECK (estimated_minutes_from_previous >= 0),
      ADD UNIQUE KEY line_stop_unique(bus_line_id,bus_stop_id)`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE bus_line_stops DROP INDEX line_stop_unique, DROP COLUMN estimated_minutes_from_previous',
    );
  }
}
