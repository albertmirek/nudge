import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import type { TestProject } from 'vitest/node';
import { buildDataSourceOptions } from '../src/database/typeorm.options.js';

declare module 'vitest' {
  export interface ProvidedContext {
    DATABASE_URL: string;
  }
}

// Runs once per `vitest run` in the main process: starts a throwaway Postgres, applies every
// migration, and hands the URL to the test workers (see setup-env.ts).
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const url = container.getConnectionUri();

  const dataSource = new DataSource(buildDataSourceOptions(url));
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }

  project.provide('DATABASE_URL', url);

  return async () => {
    await container.stop();
  };
}
