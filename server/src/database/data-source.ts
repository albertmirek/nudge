import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.options.js';

// Standalone DataSource for the TypeORM CLI (`pnpm migration:*`). Nest's DI is not available
// here, so the repo-root .env is loaded directly; already-set variables win.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // No .env file — rely on the environment (CI, docker).
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set; copy .env.example to .env or export it');
}

export default new DataSource(buildDataSourceOptions(url));
