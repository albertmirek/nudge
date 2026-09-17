// `pnpm --filter @nudge/server seed` (root: `pnpm db:seed`). Needs an up-to-date schema first
// (`pnpm db:migrate`); the migrations are not applied here.
import dataSource from './data-source.js';
import { seedDevData } from './seed.js';

await dataSource.initialize();
try {
  const summary = await seedDevData(dataSource);
  console.log(
    `Seeded dev user with ${summary.friends} friends (${summary.overdue} overdue, ${summary.upcoming} upcoming).`,
  );
} finally {
  await dataSource.destroy();
}
