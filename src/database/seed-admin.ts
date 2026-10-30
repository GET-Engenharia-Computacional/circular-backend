import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
async function seed() {
  if (process.argv.includes('--help')) {
    console.log(
      'seed:admin — configure ADMIN_REGISTRATION e ADMIN_PASSWORD (12–72 bytes). Preserva administradores existentes.',
    );
    return;
  }
  const registration = process.env.ADMIN_REGISTRATION;
  const password = process.env.ADMIN_PASSWORD;
  if (!registration || !password || password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error('Set ADMIN_REGISTRATION and ADMIN_PASSWORD (12–72 bytes)');
  await dataSource.initialize();
  try {
    await dataSource.query(
      `INSERT INTO users(id,registration_number,password_hash,user_type_id,is_active) VALUES (?,?,?,(SELECT id FROM user_types WHERE name='admin'),true) ON DUPLICATE KEY UPDATE id=id`,
      [randomUUID(), registration, await bcrypt.hash(password, 12)],
    );
    console.log('Administrator bootstrap complete (existing accounts are preserved).');
  } finally {
    await dataSource.destroy();
  }
}
seed().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Administrator bootstrap failed');
  process.exitCode = 1;
});
