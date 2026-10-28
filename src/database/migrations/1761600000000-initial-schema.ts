import { MigrationInterface, QueryRunner } from 'typeorm';
import { schemaStatements } from '../schema';
export class InitialSchema1761600000000 implements MigrationInterface {
  transaction = false;
  async up(q: QueryRunner): Promise<void> {
    for (const statement of schemaStatements) await q.query(statement);
  }
  async down(q: QueryRunner): Promise<void> {
    for (const table of [
      'forum_answers',
      'forum_posts',
      'campus_places',
      'bus_locations',
      'driver_sessions',
      'bus_stops',
      'bus_lines',
      'license_plates',
      'users',
      'user_types',
    ]) {
      await q.query(`DROP TABLE ${table}`);
    }
  }
}
