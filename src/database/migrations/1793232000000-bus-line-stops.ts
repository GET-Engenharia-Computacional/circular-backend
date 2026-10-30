import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusLineStops1793232000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE bus_line_stops (
      bus_line_id CHAR(36) NOT NULL, bus_stop_id CHAR(36) NOT NULL,
      stop_sequence INT NOT NULL CHECK (stop_sequence > 0),
      PRIMARY KEY (bus_line_id, stop_sequence),
      INDEX line_stops_stop(bus_stop_id),
      FOREIGN KEY (bus_line_id) REFERENCES bus_lines(id) ON DELETE CASCADE,
      FOREIGN KEY (bus_stop_id) REFERENCES bus_stops(id)
    ) ENGINE=InnoDB`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE bus_line_stops');
  }
}
