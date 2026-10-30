import { MigrationInterface, QueryRunner } from 'typeorm';
export class TelemetryDedup1793404800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE bus_locations ADD UNIQUE KEY telemetry_sample_once(session_id,timestamp,bus_status)',
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE bus_locations DROP INDEX telemetry_sample_once');
  }
}
