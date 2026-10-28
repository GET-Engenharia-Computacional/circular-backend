import dataSource from './data-source';
import { importLegacyStops } from './legacy/import-stops';

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--dry-run')) throw new Error('Supported option: --dry-run');
  await dataSource.initialize();
  try {
    console.log(
      JSON.stringify(await importLegacyStops(dataSource, args.includes('--dry-run')), null, 2),
    );
  } finally {
    await dataSource.destroy();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Legacy import failed');
  process.exitCode = 1;
});
