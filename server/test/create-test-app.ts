import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import type { AuthenticatedRequest } from '../src/common/current-user.js';
import { EmailService, type EmailMessage } from '../src/email/email.service.js';
import { User } from '../src/users/entities/user.entity.js';

export type TestApp = { app: INestApplication<App>; dataSource: DataSource };

/** Captures outbound mail so specs can read verification / reset codes out of it. */
export class FakeEmailService extends EmailService {
  sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  lastCodeFor(email: string): string {
    const message = [...this.sent].reverse().find((m) => m.to === email);
    const match = message && /code is (\d{6})/.exec(message.text);
    if (!match) throw new Error(`No code emailed to ${email}`);
    // noUncheckedIndexedAccess: group 1 always exists when the regex matches.
    return match[1]!;
  }
}

/** Boots the real AppModule against the e2e database (DATABASE_URL from setup-env.ts). */
export async function createTestApp(
  currentUserId?: () => string | undefined,
  email?: EmailService,
): Promise<TestApp> {
  const moduleBuilder = Test.createTestingModule({ imports: [AppModule] });
  if (email) moduleBuilder.overrideProvider(EmailService).useValue(email);
  const moduleRef = await moduleBuilder.compile();
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

let userSequence = 0;

/** Inserts a user with a unique email; e2e specs must not hand-roll users now that email is required. */
export async function createUser(
  dataSource: DataSource,
  overrides: Partial<User> = {},
): Promise<User> {
  userSequence += 1;
  return dataSource.getRepository(User).save({
    email: `user${userSequence}@example.com`,
    timezone: 'Europe/Prague',
    ...overrides,
  });
}
