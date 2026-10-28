import dataSource from './data-source';
import { importCampusPlaces } from './import-campus-places';
async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--dry-run')) throw new Error('Supported option: --dry-run');
  await dataSource.initialize();
  try {
    console.log(
      JSON.stringify(await importCampusPlaces(dataSource, args.includes('--dry-run')), null, 2),
    );
  } finally {
    await dataSource.destroy();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
