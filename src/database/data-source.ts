import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { InitialSchema1761600000000 } from './migrations/1761600000000-initial-schema';
import { entities } from './entities';

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
  migrations: [InitialSchema1761600000000],
  migrationsRun: false,
});
export default dataSource;
