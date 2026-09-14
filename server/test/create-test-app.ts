import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import type { AuthenticatedRequest } from '../src/common/current-user.js';

export type TestApp = { app: INestApplication<App>; dataSource: DataSource };

/** Boots the real AppModule against the e2e database (DATABASE_URL from setup-env.ts). */
export async function createTestApp(currentUserId?: () => string | undefined): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  if (currentUserId) {
    // Test-only trusted context. Production never accepts identity from a request header/body.
    app.use((request: AuthenticatedRequest, _response: unknown, next: () => void) => {
      const id = currentUserId();
      if (id) request.user = { id };
      next();
    });
  }
  await app.init();
  return { app, dataSource: app.get(DataSource) };
}

/** Empties every entity table; call in beforeEach to isolate tests without re-migrating. */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const tables = dataSource.entityMetadatas.map((meta) => `"${meta.tableName}"`);
  if (tables.length === 0) return;
  await dataSource.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
}
