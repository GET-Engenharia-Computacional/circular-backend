import 'reflect-metadata';
import { CircularRoutes1793577600000 } from './migrations/1793577600000-circular-routes';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { InitialSchema1761600000000 } from './migrations/1761600000000-initial-schema';
import { entities } from './entities';
import { CampusPlaceStatus1793491200000 } from './migrations/1793491200000-campus-place-status';
import { BusLineStops1793232000000 } from './migrations/1793232000000-bus-line-stops';
import { AdminRoutes1793318400000 } from './migrations/1793318400000-admin-routes';
import { TelemetryDedup1793404800000 } from './migrations/1793404800000-telemetry-dedup';

const dataSource = new DataSource({
  type: 'mysql',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: Number(process.env.DATABASE_PORT ?? 3306),
        username: process.env.DATABASE_USERNAME ?? 'localizaufjf',
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME ?? 'localizaufjf',
      }),
  connectTimeout: 5000,
  timezone: 'Z',
  charset: 'utf8mb4',
  supportBigNumbers: true,
  multipleStatements: false,
  migrationsTransactionMode: 'none',
  synchronize: false,
  entities,
  migrations: [
    InitialSchema1761600000000,
    BusLineStops1793232000000,
    AdminRoutes1793318400000,
    TelemetryDedup1793404800000,
    CampusPlaceStatus1793491200000,
    CircularRoutes1793577600000,
  ],
  migrationsRun: false,
});
export default dataSource;
