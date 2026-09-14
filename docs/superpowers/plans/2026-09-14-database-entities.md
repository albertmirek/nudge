# Database Entities & Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the NestJS server to PostgreSQL via TypeORM, implement the User / Friend / Channel / CatchUp / Nudge entities inside `users`, `friends` and `nudges` modules, manage the schema with a committed migration, and give e2e tests a throwaway migrated Postgres.

**Architecture:** A `DatabaseModule` wraps `TypeOrmModule.forRootAsync`; one option builder (`typeorm.options.ts`) with explicit entity and migration lists feeds both Nest and the TypeORM CLI (run through `tsx`). Feature modules own their entities and expose repositories through `TypeOrmModule.forFeature`. E2e tests boot the real `AppModule` against a Testcontainers Postgres migrated in vitest's `globalSetup`.

**Tech Stack:** NestJS 12 (ESM), TypeORM 1.1.x, `@nestjs/typeorm` 12, `pg` 8, `tsx` 4, vitest 4, `@testcontainers/postgresql` 12, PostgreSQL 17.

**Spec:** `docs/superpowers/specs/2026-09-14-database-entities-design.md`

## Global Constraints

- Package manager pnpm 11; run `CI=1 pnpm add …` (non-interactive). pnpm settings live in `pnpm-workspace.yaml`, not `.npmrc`.
- Server is ESM (`"type": "module"`): relative imports **must** carry the `.js` extension (`./user.entity.js`).
- Primary keys: `uuid` via `@PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: '<table>_pkey' })`; `uuidExtension: 'pgcrypto'` so Postgres uses `gen_random_uuid()`.
- All timestamps `timestamptz`; `created_at` via `@CreateDateColumn`, `updated_at` via `@UpdateDateColumn`.
- Tables/columns/enum types snake_case via explicit `name` / `enumName`; entity properties camelCase.
- Every `@Column` declares an explicit `type` (tsx emits no decorator metadata). Every relation names its target with an arrow function.
- Every FK: `onDelete: 'CASCADE'`, `nullable: false`, explicit `foreignKeyConstraintName: '<table>_<column>_fkey'`. Every index explicitly named `<table>_<cols>_idx`.
- `synchronize: false`, `migrationsRun: false` everywhere. Schema changes only through migrations.
- Nothing `eager`.
- Prettier: single quotes, semicolons, trailing commas, print width 100. Run `pnpm lint && pnpm format:check && pnpm typecheck` before every commit.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01T6RnKKXP8gLVBKYmcp4AK7
  ```
- The compose stack from the main checkout is already running (`nudge-db-1` on `localhost:5432`, user/password/db `nudge`). This worktree has no `.env`; create it with `cp .env.example .env` when a task needs it. Don't start a second compose project from this worktree (ports clash).

---

### Task 1: TypeORM connection, CLI data source, health DB ping

**Files:**

- Modify: `server/package.json` (deps + scripts)
- Create: `server/src/database/typeorm.options.ts`
- Create: `server/src/database/database.module.ts`
- Create: `server/src/database/data-source.ts`
- Create: `server/src/database/cli.ts`
- Create: `server/src/database/migrations/index.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/src/health/health.controller.ts`
- Modify: `server/src/health/health.controller.spec.ts`
- Modify: `package.json` (root `db:migrate` script)

**Interfaces:**

- Produces: `buildDataSourceOptions(url: string): DataSourceOptions` in `typeorm.options.ts` — used by `DatabaseModule`, `data-source.ts` and the test global setup (Task 2). `entities` and `migrations` arrays inside it are extended in Tasks 3 and 5.
- Produces: `DatabaseModule` (imported by `AppModule`).
- Produces: `server` scripts `typeorm`, `migration:generate`, `migration:run`, `migration:revert`, `migration:show`; root script `db:migrate`.

- [ ] **Step 1: Install dependencies**

```bash
cd server
CI=1 pnpm add typeorm@^1.1.1 @nestjs/typeorm@^12.0.1 pg@^8.23.0
CI=1 pnpm add -D tsx@^4.23.0 @testcontainers/postgresql@^12.1.0
cd ..
```

Expected: lockfile updated at the root, no build-script warnings. If pnpm refuses a version for release age, use the newest version it accepts (do not add exclusions).

- [ ] **Step 2: Write the failing health unit test**

Replace `server/src/health/health.controller.spec.ts`:

```ts
import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const query = vi.fn();

  async function build() {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: { query } }],
    }).compile();
    return moduleRef.get(HealthController);
  }

  beforeEach(() => query.mockReset());

  it('returns ok when the database answers', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);
    const controller = await build();

    await expect(controller.check()).resolves.toEqual({ status: 'ok', db: 'ok' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns 503 when the database query fails', async () => {
    query.mockRejectedValue(new Error('connection refused'));
    const controller = await build();

    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
```

- [ ] **Step 3: Run the unit test to verify it fails**

Run: `pnpm --filter @nudge/server test -- health`
Expected: FAIL — `check()` returns a plain object, not a promise, and `@nestjs/typeorm` token is unused (`resolves` assertion fails).

- [ ] **Step 4: Write the shared TypeORM options**

`server/src/database/migrations/index.ts`:

```ts
import type { MigrationInterface, MixedList } from 'typeorm';

// Register every migration class here; the TypeORM CLI and the test global setup read this list.
export const migrations: MixedList<new () => MigrationInterface> = [];
```

`server/src/database/typeorm.options.ts`:

```ts
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
```

- [ ] **Step 5: Write the Nest DatabaseModule**

`server/src/database/database.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './typeorm.options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions(config.getOrThrow<string>('DATABASE_URL')),
    }),
  ],
})
export class DatabaseModule {}
```

- [ ] **Step 6: Write the CLI data source and shim**

`server/src/database/data-source.ts`:

```ts
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
```

`server/src/database/cli.ts`:

```ts
// pnpm's hoisted layout leaves no server/node_modules/typeorm, so scripts cannot point at
// ./node_modules/typeorm/cli.js. This shim lets `tsx src/database/cli.ts <command>` run the
// TypeORM CLI with TypeScript support for data-source.ts and the entities.
import 'typeorm/cli.js';
```

- [ ] **Step 7: Add scripts**

In `server/package.json` `scripts`, add:

```json
"typeorm": "tsx src/database/cli.ts",
"migration:generate": "sh -c 'pnpm typeorm migration:generate -d src/database/data-source.ts src/database/migrations/$0'",
"migration:run": "pnpm typeorm migration:run -d src/database/data-source.ts",
"migration:revert": "pnpm typeorm migration:revert -d src/database/data-source.ts",
"migration:show": "pnpm typeorm migration:show -d src/database/data-source.ts"
```

(pnpm appends extra CLI args to the script, so `pnpm migration:generate Foo` makes `Foo` the
`$0` of the inner `sh -c` and the file lands in `src/database/migrations/<timestamp>-Foo.ts`.)

In root `package.json` `scripts`, after `"docker:db"`, add:

```json
"db:migrate": "pnpm --filter @nudge/server migration:run",
```

- [ ] **Step 8: Wire DatabaseModule into AppModule and load the root .env**

Replace `server/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    // `.env` lives at the repo root; the server's cwd is `server/` when run natively.
    // Inside docker compose the variables come from env_file/environment instead.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    DatabaseModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 9: Add the DB ping to the health controller**

Replace `server/src/health/health.controller.ts`:

```ts
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type HealthStatus = { status: 'ok'; db: 'ok' };

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'ok' };
  }
}
```

- [ ] **Step 10: Run unit tests, typecheck, lint**

Run: `pnpm --filter @nudge/server test && pnpm typecheck && pnpm lint && pnpm format:check`
Expected: all pass (3 unit test files).

- [ ] **Step 11: Smoke-test the CLI against the running database**

```bash
cp -n .env.example .env
pnpm --filter @nudge/server migration:show
```

Expected: exits 0 and prints no migrations (the list is empty) — proves `data-source.ts` loads under tsx and connects. If it prints `DATABASE_URL is not set`, the `.env` path resolution is wrong; fix `data-source.ts`.

- [ ] **Step 12: Commit**

```bash
git add server/package.json pnpm-lock.yaml package.json server/src
git commit -m "feat(server): connect to postgres via typeorm and add migration CLI

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01T6RnKKXP8gLVBKYmcp4AK7"
```

---

### Task 2: E2E test environment with Testcontainers

**Files:**

- Create: `server/test/global-setup.ts`
- Create: `server/test/setup-env.ts`
- Create: `server/test/create-test-app.ts`
- Modify: `server/test/app.e2e-spec.ts`
- Modify: `server/vitest.config.e2e.ts`

**Interfaces:**

- Consumes: `buildDataSourceOptions(url)` from Task 1.
- Produces: `createTestApp(): Promise<{ app: INestApplication<App>; dataSource: DataSource }>` and `truncateAll(dataSource: DataSource): Promise<void>` in `server/test/create-test-app.ts` — used by Task 4.
- Produces: `process.env.DATABASE_URL` set in every e2e worker to the Testcontainers URL, schema migrated.

- [ ] **Step 1: Update the e2e test to expect the DB ping (failing)**

Replace `server/test/app.e2e-spec.ts`:

```ts
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('/health (GET) reports the database as reachable', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', db: 'ok' });
  });
});
```

- [ ] **Step 2: Run e2e to verify it fails**

Run: `pnpm --filter @nudge/server test:e2e`
Expected: FAIL — `./create-test-app.js` cannot be resolved.

- [ ] **Step 3: Write the global setup (container + migrations)**

`server/test/global-setup.ts`:

```ts
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
```

`server/test/setup-env.ts`:

```ts
import { inject } from 'vitest';

// Runs in every e2e worker before the test file: point the app at the container from global-setup.
process.env.DATABASE_URL = inject('DATABASE_URL');
```

- [ ] **Step 4: Write the test-app helper**

`server/test/create-test-app.ts`:

```ts
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';

export type TestApp = { app: INestApplication<App>; dataSource: DataSource };

/** Boots the real AppModule against the e2e database (DATABASE_URL from setup-env.ts). */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  return { app, dataSource: app.get(DataSource) };
}

/** Empties every entity table; call in beforeEach to isolate tests without re-migrating. */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const tables = dataSource.entityMetadatas.map((meta) => `"${meta.tableName}"`);
  if (tables.length === 0) return;
  await dataSource.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
}
```

- [ ] **Step 5: Wire vitest e2e config**

Replace `server/vitest.config.e2e.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // One shared database per run: keep files sequential so truncation in one file
    // cannot race another file's inserts.
    fileParallelism: false,
    // First run pulls postgres:17-alpine; container start is a few seconds afterwards.
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
```

- [ ] **Step 6: Run e2e to verify it passes**

Run: `pnpm --filter @nudge/server test:e2e`
Expected: PASS, 2 tests; console shows the container starting. Run `docker ps` afterwards — no `postgres:17-alpine` test container left behind (only `nudge-db-1`).

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint && pnpm format:check`
Expected: pass. (`server/tsconfig.json` has no `include`, so `test/` is typechecked.)

- [ ] **Step 8: Commit**

```bash
git add server/test server/vitest.config.e2e.ts
git commit -m "test(server): e2e environment with a migrated testcontainers postgres

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01T6RnKKXP8gLVBKYmcp4AK7"
```

---

### Task 3: Entities and feature modules

**Files:**

- Create: `server/src/users/entities/user.entity.ts`
- Create: `server/src/users/users.module.ts`
- Create: `server/src/friends/entities/friend-periodicity.enum.ts`
- Create: `server/src/friends/entities/friend.entity.ts`
- Create: `server/src/friends/entities/channel-type.enum.ts`
- Create: `server/src/friends/entities/channel.entity.ts`
- Create: `server/src/friends/entities/catch-up.entity.ts`
- Create: `server/src/friends/friends.module.ts`
- Create: `server/src/nudges/entities/nudge-status.enum.ts`
- Create: `server/src/nudges/entities/nudge.entity.ts`
- Create: `server/src/nudges/nudges.module.ts`
- Modify: `server/src/database/typeorm.options.ts` (entities list)
- Modify: `server/src/app.module.ts` (import feature modules)

**Interfaces:**

- Produces entity classes `User`, `Friend`, `Channel`, `CatchUp`, `Nudge` and enums `FriendPeriodicity`, `ChannelType`, `NudgeStatus` — used by Task 4 tests and Task 5 migration.
- Property names (camelCase) ↔ column names (snake_case) exactly as below; Task 4 relies on the property names.

- [ ] **Step 1: User entity and module**

`server/src/users/entities/user.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity.js';
import { Nudge } from '../../nudges/entities/nudge.entity.js';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'users_pkey' })
  id: string;

  /** IANA zone name (e.g. "Europe/Prague"); the scheduler resolves reminder times per date. */
  @Column({ type: 'text' })
  timezone: string;

  /** Local wall-clock time of day, "HH:MM:SS". */
  @Column({ type: 'time', name: 'preferred_reminder_local_time', default: '18:00:00' })
  preferredReminderLocalTime: string;

  /** Master switch; individual friends have their own flag. */
  @Column({ type: 'boolean', name: 'nudge_enabled', default: true })
  nudgeEnabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Friend, (friend) => friend.user)
  friends: Friend[];

  @OneToMany(() => Nudge, (nudge) => nudge.user)
  nudges: Nudge[];
}
```

`server/src/users/users.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
```

- [ ] **Step 2: Friend enums and entities**

`server/src/friends/entities/friend-periodicity.enum.ts`:

```ts
export enum FriendPeriodicity {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}
```

`server/src/friends/entities/channel-type.enum.ts`:

```ts
export enum ChannelType {
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  SIGNAL = 'SIGNAL',
  IMESSAGE = 'IMESSAGE',
  SMS = 'SMS',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  OTHER = 'OTHER',
}
```

`server/src/friends/entities/friend.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Nudge } from '../../nudges/entities/nudge.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { CatchUp } from './catch-up.entity.js';
import { Channel } from './channel.entity.js';
import { FriendPeriodicity } from './friend-periodicity.enum.js';

@Entity({ name: 'friends' })
@Index('friends_user_id_idx', ['userId'])
export class Friend {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'friends_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.friends, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'friends_user_id_fkey' })
  user: User;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'enum', enum: FriendPeriodicity, enumName: 'friends_periodicity_enum' })
  periodicity: FriendPeriodicity;

  @Column({ type: 'timestamptz', name: 'last_contact_at', nullable: true })
  lastContactAt: Date | null;

  @Column({ type: 'boolean', name: 'nudge_enabled', default: true })
  nudgeEnabled: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Channel, (channel) => channel.friend)
  channels: Channel[];

  @OneToMany(() => CatchUp, (catchUp) => catchUp.friend)
  catchUps: CatchUp[];

  @OneToMany(() => Nudge, (nudge) => nudge.friend)
  nudges: Nudge[];
}
```

`server/src/friends/entities/channel.entity.ts`:

```ts
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChannelType } from './channel-type.enum.js';
import { Friend } from './friend.entity.js';

@Entity({ name: 'channels' })
@Index('channels_friend_id_idx', ['friendId'])
export class Channel {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'channels_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.channels, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'channels_friend_id_fkey' })
  friend: Friend;

  @Column({ type: 'enum', enum: ChannelType, enumName: 'channels_type_enum' })
  type: ChannelType;

  /** App/URL scheme link that opens the conversation (whatsapp://…, tel:…, mailto:…). */
  @Column({ type: 'text', name: 'deep_link' })
  deepLink: string;
}
```

`server/src/friends/entities/catch-up.entity.ts`:

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Friend } from './friend.entity.js';

@Entity({ name: 'catch_ups' })
@Index('catch_ups_friend_id_created_at_idx', ['friendId', 'createdAt'])
export class CatchUp {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'catch_ups_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.catchUps, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'catch_ups_friend_id_fkey' })
  friend: Friend;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
```

`server/src/friends/friends.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatchUp } from './entities/catch-up.entity.js';
import { Channel } from './entities/channel.entity.js';
import { Friend } from './entities/friend.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, Channel, CatchUp])],
  exports: [TypeOrmModule],
})
export class FriendsModule {}
```

- [ ] **Step 3: Nudge enum, entity and module**

`server/src/nudges/entities/nudge-status.enum.ts`:

```ts
export enum NudgeStatus {
  PLANNED = 'PLANNED',
  SNOOZED = 'SNOOZED',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
}
```

`server/src/nudges/entities/nudge.entity.ts`:

```ts
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Friend } from '../../friends/entities/friend.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { NudgeStatus } from './nudge-status.enum.js';

@Entity({ name: 'nudges' })
@Index('nudges_user_id_status_scheduled_for_idx', ['userId', 'status', 'scheduledFor'])
@Index('nudges_friend_id_idx', ['friendId'])
export class Nudge {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'nudges_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.nudges, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nudges_user_id_fkey' })
  user: User;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.nudges, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'nudges_friend_id_fkey' })
  friend: Friend;

  /** UTC instant at which the push should be delivered. */
  @Column({ type: 'timestamptz', name: 'scheduled_for' })
  scheduledFor: Date;

  @Column({
    type: 'enum',
    enum: NudgeStatus,
    enumName: 'nudges_status_enum',
    default: NudgeStatus.PLANNED,
  })
  status: NudgeStatus;
}
```

`server/src/nudges/nudges.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nudge } from './entities/nudge.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Nudge])],
  exports: [TypeOrmModule],
})
export class NudgesModule {}
```

- [ ] **Step 4: Register entities and modules**

In `server/src/database/typeorm.options.ts`, add imports and fill the list:

```ts
import { CatchUp } from '../friends/entities/catch-up.entity.js';
import { Channel } from '../friends/entities/channel.entity.js';
import { Friend } from '../friends/entities/friend.entity.js';
import { Nudge } from '../nudges/entities/nudge.entity.js';
import { User } from '../users/entities/user.entity.js';
```

and `entities: [User, Friend, Channel, CatchUp, Nudge],`.

In `server/src/app.module.ts`, import the three modules and add `UsersModule, FriendsModule, NudgesModule` to `imports` after `DatabaseModule`:

```ts
import { FriendsModule } from './friends/friends.module.js';
import { NudgesModule } from './nudges/nudges.module.js';
import { UsersModule } from './users/users.module.js';
```

- [ ] **Step 5: Verify the metadata builds and the app still boots**

Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm --filter @nudge/server test:e2e`
Expected: all pass. The e2e boot proves TypeORM accepted the entity metadata (circular imports between `user`/`friend`/`nudge` entities are fine because relation targets are arrow functions). There are no tables yet — that is Task 5.

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat(server): add user, friend, channel, catch-up and nudge entities

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01T6RnKKXP8gLVBKYmcp4AK7"
```

---

### Task 4: Entity e2e test (red)

**Files:**

- Create: `server/test/database.e2e-spec.ts`

**Interfaces:**

- Consumes: `createTestApp`, `truncateAll` (Task 2); entities and enums (Task 3).

- [ ] **Step 1: Write the test**

`server/test/database.e2e-spec.ts`:

```ts
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource, QueryFailedError } from 'typeorm';
import { CatchUp } from '../src/friends/entities/catch-up.entity.js';
import { ChannelType } from '../src/friends/entities/channel-type.enum.js';
import { Channel } from '../src/friends/entities/channel.entity.js';
import { FriendPeriodicity } from '../src/friends/entities/friend-periodicity.enum.js';
import { Friend } from '../src/friends/entities/friend.entity.js';
import { NudgeStatus } from '../src/nudges/entities/nudge-status.enum.js';
import { Nudge } from '../src/nudges/entities/nudge.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { createTestApp, truncateAll } from './create-test-app.js';

describe('Entities (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(() => truncateAll(dataSource));

  afterAll(async () => {
    await app.close();
  });

  async function createUser(): Promise<User> {
    return dataSource.getRepository(User).save({ timezone: 'Europe/Prague' });
  }

  async function createFriend(user: User): Promise<Friend> {
    return dataSource
      .getRepository(Friend)
      .save({ userId: user.id, name: 'Alice', periodicity: FriendPeriodicity.MONTHLY });
  }

  it('applies column defaults on users', async () => {
    const user = await createUser();

    const found = await dataSource.getRepository(User).findOneByOrFail({ id: user.id });
    expect(found.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(found.preferredReminderLocalTime).toBe('18:00:00');
    expect(found.nudgeEnabled).toBe(true);
    expect(found.createdAt).toBeInstanceOf(Date);
  });

  it('loads a friend with its channels, catch-ups and nudges', async () => {
    const user = await createUser();
    const friend = await createFriend(user);
    await dataSource
      .getRepository(Channel)
      .save({ friendId: friend.id, type: ChannelType.WHATSAPP, deepLink: 'whatsapp://send' });
    await dataSource.getRepository(CatchUp).save({ friendId: friend.id, note: 'coffee' });
    await dataSource.getRepository(Nudge).save({
      userId: user.id,
      friendId: friend.id,
      scheduledFor: new Date('2026-10-01T16:00:00Z'),
    });

    const loaded = await dataSource.getRepository(Friend).findOneOrFail({
      where: { id: friend.id },
      relations: { user: true, channels: true, catchUps: true, nudges: true },
    });

    expect(loaded.user.id).toBe(user.id);
    expect(loaded.periodicity).toBe(FriendPeriodicity.MONTHLY);
    expect(loaded.lastContactAt).toBeNull();
    expect(loaded.channels).toEqual([
      expect.objectContaining({ type: ChannelType.WHATSAPP, deepLink: 'whatsapp://send' }),
    ]);
    expect(loaded.catchUps).toEqual([expect.objectContaining({ note: 'coffee' })]);
    expect(loaded.nudges).toEqual([
      expect.objectContaining({
        status: NudgeStatus.PLANNED,
        scheduledFor: new Date('2026-10-01T16:00:00Z'),
      }),
    ]);
  });

  it('rejects values outside the enums', async () => {
    const user = await createUser();

    await expect(
      dataSource
        .getRepository(Friend)
        .insert({ userId: user.id, name: 'Bob', periodicity: 'DAILY' as FriendPeriodicity }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('rejects a friend without an existing user', async () => {
    await expect(
      dataSource.getRepository(Friend).insert({
        userId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost',
        periodicity: FriendPeriodicity.WEEKLY,
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('cascades a user delete to friends, channels, catch-ups and nudges', async () => {
    const user = await createUser();
    const friend = await createFriend(user);
    await dataSource
      .getRepository(Channel)
      .save({ friendId: friend.id, type: ChannelType.SMS, deepLink: 'sms:+420' });
    await dataSource.getRepository(CatchUp).save({ friendId: friend.id, note: null });
    await dataSource
      .getRepository(Nudge)
      .save({ userId: user.id, friendId: friend.id, scheduledFor: new Date() });

    await dataSource.getRepository(User).delete({ id: user.id });

    await expect(dataSource.getRepository(Friend).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Channel).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(CatchUp).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Nudge).count()).resolves.toBe(0);
  });

  it('bumps updated_at when a friend changes', async () => {
    const user = await createUser();
    const friend = await createFriend(user);

    await new Promise((resolve) => setTimeout(resolve, 5));
    await dataSource.getRepository(Friend).update({ id: friend.id }, { name: 'Alicia' });

    const reloaded = await dataSource.getRepository(Friend).findOneByOrFail({ id: friend.id });
    expect(reloaded.updatedAt.getTime()).toBeGreaterThan(friend.updatedAt.getTime());
  });
});
```

- [ ] **Step 2: Run it to verify it fails for the right reason**

Run: `pnpm --filter @nudge/server test:e2e`
Expected: `app.e2e-spec.ts` passes; `database.e2e-spec.ts` fails on every test with `QueryFailedError: relation "users" does not exist` (from `truncateAll` or the first insert). Any other failure means Task 3 is wrong — fix it there, not here.

- [ ] **Step 3: Typecheck and lint, then commit**

Run: `pnpm typecheck && pnpm lint && pnpm format:check`
Expected: pass.

```bash
git add server/test/database.e2e-spec.ts
git commit -m "test(server): e2e coverage for entity persistence, enums and cascades

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01T6RnKKXP8gLVBKYmcp4AK7"
```

---

### Task 5: Initial migration, apply to Postgres, docs

**Files:**

- Create: `server/src/database/migrations/1789376400000-InitialSchema.ts`
- Modify: `server/src/database/migrations/index.ts`
- Modify: `README.md`

**Interfaces:**

- Consumes: entities (Task 3), CLI scripts (Task 1).
- Produces: applied schema in the local Postgres; green e2e suite.

- [ ] **Step 1: Generate the migration from the entities**

The compose database must be running (`docker ps` shows `nudge-db-1`) and `.env` must exist (Task 1 Step 11).

```bash
pnpm --filter @nudge/server migration:generate InitialSchema
```

Expected: `Migration .../src/database/migrations/<timestamp>-InitialSchema.ts has been generated successfully.` Rename the file to `1789376400000-InitialSchema.ts` and the class to `InitialSchema1789376400000` (`name` property too) so the plan's references match.

- [ ] **Step 2: Review the generated file against the reference**

It must be equivalent to the following (statement order may differ; `public.` prefixes are fine). If any constraint or column differs, fix the **entity** and regenerate — do not hand-edit the SQL:

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789376400000 implements MigrationInterface {
  name = 'InitialSchema1789376400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "timezone" text NOT NULL, "preferred_reminder_local_time" TIME NOT NULL DEFAULT '18:00:00', "nudge_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."friends_periodicity_enum" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "friends" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "name" text NOT NULL, "periodicity" "public"."friends_periodicity_enum" NOT NULL, "last_contact_at" TIMESTAMP WITH TIME ZONE, "nudge_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "friends_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "friends_user_id_idx" ON "friends" ("user_id") `);
    await queryRunner.query(
      `CREATE TYPE "public"."channels_type_enum" AS ENUM('WHATSAPP', 'TELEGRAM', 'SIGNAL', 'IMESSAGE', 'SMS', 'PHONE', 'EMAIL', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "channels" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "friend_id" uuid NOT NULL, "type" "public"."channels_type_enum" NOT NULL, "deep_link" text NOT NULL, CONSTRAINT "channels_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "channels_friend_id_idx" ON "channels" ("friend_id") `);
    await queryRunner.query(
      `CREATE TABLE "catch_ups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "friend_id" uuid NOT NULL, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "catch_ups_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "catch_ups_friend_id_created_at_idx" ON "catch_ups" ("friend_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."nudges_status_enum" AS ENUM('PLANNED', 'SNOOZED', 'SENT', 'CONFIRMED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "nudges" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "friend_id" uuid NOT NULL, "scheduled_for" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."nudges_status_enum" NOT NULL DEFAULT 'PLANNED', CONSTRAINT "nudges_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "nudges_user_id_status_scheduled_for_idx" ON "nudges" ("user_id", "status", "scheduled_for") `,
    );
    await queryRunner.query(`CREATE INDEX "nudges_friend_id_idx" ON "nudges" ("friend_id") `);
    await queryRunner.query(
      `ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "channels_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "catch_ups" ADD CONSTRAINT "catch_ups_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nudges" ADD CONSTRAINT "nudges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nudges" ADD CONSTRAINT "nudges_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nudges" DROP CONSTRAINT "nudges_friend_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "nudges" DROP CONSTRAINT "nudges_user_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "catch_ups" DROP CONSTRAINT "catch_ups_friend_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "channels" DROP CONSTRAINT "channels_friend_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "friends" DROP CONSTRAINT "friends_user_id_fkey"`);
    await queryRunner.query(`DROP INDEX "public"."nudges_friend_id_idx"`);
    await queryRunner.query(`DROP INDEX "public"."nudges_user_id_status_scheduled_for_idx"`);
    await queryRunner.query(`DROP TABLE "nudges"`);
    await queryRunner.query(`DROP TYPE "public"."nudges_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."catch_ups_friend_id_created_at_idx"`);
    await queryRunner.query(`DROP TABLE "catch_ups"`);
    await queryRunner.query(`DROP INDEX "public"."channels_friend_id_idx"`);
    await queryRunner.query(`DROP TABLE "channels"`);
    await queryRunner.query(`DROP TYPE "public"."channels_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."friends_user_id_idx"`);
    await queryRunner.query(`DROP TABLE "friends"`);
    await queryRunner.query(`DROP TYPE "public"."friends_periodicity_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
```

Change the generated `import { MigrationInterface, QueryRunner } from "typeorm"` to `import type …` (both are types), then run `pnpm prettier --write server/src/database/migrations`.

- [ ] **Step 3: Register the migration**

Replace `server/src/database/migrations/index.ts`:

```ts
import type { MigrationInterface, MixedList } from 'typeorm';
import { InitialSchema1789376400000 } from './1789376400000-InitialSchema.js';

// Register every migration class here; the TypeORM CLI and the test global setup read this list.
export const migrations: MixedList<new () => MigrationInterface> = [InitialSchema1789376400000];
```

- [ ] **Step 4: Run e2e to verify green**

Run: `pnpm --filter @nudge/server test:e2e`
Expected: PASS — `app.e2e-spec.ts` (2) and `database.e2e-spec.ts` (6). The global setup now applies `InitialSchema` to the container.

- [ ] **Step 5: Apply to the local Postgres and prove it is in sync**

```bash
pnpm db:migrate
pnpm --filter @nudge/server migration:show
docker exec nudge-db-1 psql -U nudge -d nudge -c '\dt' -c '\dT'
pnpm --filter @nudge/server migration:generate Probe
```

Expected, in order:

1. `Migration InitialSchema1789376400000 has been executed successfully.`
2. `[X] 1 InitialSchema1789376400000`
3. Tables `users`, `friends`, `channels`, `catch_ups`, `nudges`, `migrations`; types `friends_periodicity_enum`, `channels_type_enum`, `nudges_status_enum`.
4. `No changes in database schema were found - cannot generate a migration.` (nothing is written; if a file `*-Probe.ts` appeared, the entities and migration disagree — fix the entities, revert, regenerate).

Then check revert round-trips:

```bash
pnpm --filter @nudge/server migration:revert
docker exec nudge-db-1 psql -U nudge -d nudge -c '\dt'
pnpm db:migrate
```

Expected: after revert only `migrations` remains; after re-running, all five tables are back.

- [ ] **Step 6: Verify the dockerised server reports the DB**

Rebuild the running compose project's server from this worktree (same project name so it replaces `nudge-server-1` rather than starting a second stack):

```bash
docker compose -p nudge up --build -d server
sleep 5 && curl -s localhost:3000/health
```

Expected: `{"status":"ok","db":"ok"}`. Then `docker compose -p nudge logs --tail=20 server` shows no TypeORM connection errors.

- [ ] **Step 7: Update README**

In `README.md`, under **Backend (Docker)**, add after the existing table paragraph:

```markdown
### Database & migrations

The server uses TypeORM with `synchronize` off — the schema only changes through migrations in
`server/src/database/migrations/`.

| Command                                                 | What                                                     |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `pnpm db:migrate`                                       | Apply pending migrations to `DATABASE_URL` (from `.env`) |
| `pnpm --filter @nudge/server migration:generate <Name>` | Diff entities against the database → new migration file  |
| `pnpm --filter @nudge/server migration:revert`          | Roll back the last migration                             |
| `pnpm --filter @nudge/server migration:show`            | List applied / pending migrations                        |

After generating a migration, add its class to `server/src/database/migrations/index.ts` and
review the SQL. `migration:generate` needs a running database (`pnpm docker:db`).

Entities live in their feature module (`server/src/<module>/entities/*.entity.ts`) and are
registered in `server/src/database/typeorm.options.ts`.

E2e tests (`pnpm --filter @nudge/server test:e2e`) start a throwaway `postgres:17-alpine`
container via Testcontainers and run all migrations into it, so they need Docker running but
never touch your dev database.
```

Also replace the last bullet under **Conventions** ("The server does not yet connect to the database…") with:

```markdown
- `GET /health` pings the database (`SELECT 1`) and answers `{"status":"ok","db":"ok"}`, or
  HTTP 503 when Postgres is unreachable.
```

- [ ] **Step 8: Full verification and commit**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm --filter @nudge/server test:e2e`
Expected: all green.

```bash
git add server/src/database/migrations README.md
git commit -m "feat(server): initial schema migration and database docs

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01T6RnKKXP8gLVBKYmcp4AK7"
```
