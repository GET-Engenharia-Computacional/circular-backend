import { MigrationInterface, QueryRunner } from 'typeorm';
export class CampusPlaceStatus1793491200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE campus_places ADD is_active BOOLEAN NOT NULL DEFAULT true');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE campus_places DROP COLUMN is_active');
  }
}
