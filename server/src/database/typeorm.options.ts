import type { DataSourceOptions } from 'typeorm';
import { migrations } from './migrations/index.js';

// Single source of truth for the TypeORM connection. Used by DatabaseModule (Nest runtime),
// data-source.ts (TypeORM CLI) and the e2e global setup, so they cannot drift apart.
// Entities are listed explicitly rather than globbed so the list works identically under
// tsx, vitest and compiled dist/ without a TypeScript loader.
export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    uuidExtension: 'pgcrypto',
    entities: [],
    migrations,
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
