import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
async function check() {
  const connection = process.env.DATABASE_URL
    ? await createConnection(process.env.DATABASE_URL)
    : await createConnection({
        host: process.env.DATABASE_HOST ?? 'localhost',
        port: Number(process.env.DATABASE_PORT ?? 3306),
        user: process.env.DATABASE_USERNAME ?? 'localizaufjf',
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME ?? 'localizaufjf',
        connectTimeout: 5000,
        timezone: 'Z',
      });
  try {
    const [rows] = await connection.query('SELECT VERSION() AS version,DATABASE() AS databaseName');
    console.log('MySQL connection succeeded:', rows);
  } finally {
    await connection.end();
  }
}
check().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Connection failed');
  process.exitCode = 1;
});
