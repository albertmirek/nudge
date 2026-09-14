# Database connection, entities and migrations — design

Date: 2026-09-14

## Goal

Connect the NestJS server to PostgreSQL through TypeORM, implement the five domain entities
from `docs/images/Entities.png` inside feature modules, manage the schema with committed
migrations, and give e2e tests an isolated, migrated database. The outcome is a set of
entities that can be migrated into the local Postgres and exercised end to end.

## Out of scope

- Services, controllers, DTOs, validation — no HTTP API beyond the existing `/health`.
- `job_queue` (owned by pg-boss) and any pg-boss integration.
- Authentication (the `auth_subject` column from the diagram is deferred with it).
- Seed data, deploy-time migration step, CI configuration.

## Decisions

| Topic            | Decision                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ORM              | TypeORM 1.x via `@nestjs/typeorm` 12. Decorator entities, CLI-generated migrations.                                                                                               |
| Primary keys     | `uuid` (`gen_random_uuid()`): non-enumerable in URLs, client-generatable for offline sync.                                                                                        |
| Timestamps       | `timestamptz` everywhere; server runs in UTC.                                                                                                                                     |
| Naming           | snake_case tables/columns and enum type names; camelCase entity properties.                                                                                                       |
| FK behaviour     | `ON DELETE CASCADE` on every FK.                                                                                                                                                  |
| Schema changes   | Migrations only; `synchronize: false` and `migrationsRun: false` in every environment.                                                                                            |
| Test database    | Throwaway `postgres:17-alpine` container per `test:e2e` run (Testcontainers).                                                                                                     |
| `periodicity`    | Enum `WEEKLY                                                                                                                                                                      | BIWEEKLY | MONTHLY | QUARTERLY`.                                           |
| `channel.type`   | Enum `WHATSAPP                                                                                                                                                                    | TELEGRAM | SIGNAL  | IMESSAGE                                              | SMS | PHONE | EMAIL | OTHER`. |
| `nudge.status`   | Enum `PLANNED                                                                                                                                                                     | SNOOZED  | SENT    | CONFIRMED`(the diagram's`version`); no `item` column. |
| User time fields | Keep `timezone` (IANA) + `preferred_reminder_local_time` so the scheduler resolves the UTC instant per date and survives DST. `snooze_offset` omitted (constant default for now). |

## Data model

| Table       | Columns                                                                                                                                                                                                                     | Indexes / constraints                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `users`     | `id uuid PK`, `timezone text NOT NULL`, `preferred_reminder_local_time time NOT NULL DEFAULT '18:00'`, `nudge_enabled boolean NOT NULL DEFAULT true`, `created_at timestamptz NOT NULL DEFAULT now()`                       | —                                                             |
| `friends`   | `id uuid PK`, `user_id uuid FK→users`, `name text NOT NULL`, `periodicity friends_periodicity_enum NOT NULL`, `last_contact_at timestamptz NULL`, `nudge_enabled boolean NOT NULL DEFAULT true`, `created_at`, `updated_at` | index `(user_id)`                                             |
| `channels`  | `id uuid PK`, `friend_id uuid FK→friends`, `type channels_type_enum NOT NULL`, `deep_link text NOT NULL`                                                                                                                    | index `(friend_id)`                                           |
| `catch_ups` | `id uuid PK`, `friend_id uuid FK→friends`, `note text NULL`, `created_at timestamptz NOT NULL DEFAULT now()`                                                                                                                | index `(friend_id, created_at)`                               |
| `nudges`    | `id uuid PK`, `user_id uuid FK→users`, `friend_id uuid FK→friends`, `scheduled_for timestamptz NOT NULL`, `status nudges_status_enum NOT NULL DEFAULT 'PLANNED'`                                                            | index `(user_id, status, scheduled_for)`, index `(friend_id)` |

`updated_at` uses `@UpdateDateColumn`; `created_at` uses `@CreateDateColumn`.

Relations are declared on both sides (`User.friends`, `User.nudges`, `Friend.user`,
`Friend.channels`, `Friend.catchUps`, `Friend.nudges`, `Channel.friend`, `CatchUp.friend`,
`Nudge.user`, `Nudge.friend`). Nothing is `eager`; callers ask for relations explicitly.

## Module layout

```
server/src/
├── app.module.ts                 # imports ConfigModule, DatabaseModule, feature modules
├── database/
│   ├── database.module.ts        # TypeOrmModule.forRootAsync from ConfigService
│   ├── data-source.ts            # standalone DataSource for the TypeORM CLI
│   ├── typeorm.options.ts        # shared options (url, naming strategy, entity/migration globs)
│   └── migrations/
│       └── <timestamp>-InitialSchema.ts
├── health/health.controller.ts   # + DB ping
├── users/
│   ├── users.module.ts           # TypeOrmModule.forFeature([User]), exported
│   └── entities/user.entity.ts
├── friends/
│   ├── friends.module.ts         # forFeature([Friend, Channel, CatchUp]), exported
│   └── entities/{friend,channel,catch-up}.entity.ts
└── nudges/
    ├── nudges.module.ts          # forFeature([Nudge]), exported
    └── entities/nudge.entity.ts
```

Enums live next to their entity (`friend-periodicity.enum.ts`, etc.) and are exported so
future DTOs can reuse them.

## Connection

`DatabaseModule` calls `TypeOrmModule.forRootAsync` with `ConfigService`, reading
`DATABASE_URL`. `autoLoadEntities: true` picks up every entity registered through
`forFeature`, so there is no central entity list. The same option builder
(`typeorm.options.ts`) feeds both the Nest module and the CLI data source, so they can't drift.

`GET /health` executes `SELECT 1` through the `DataSource` and returns
`{ status: 'ok', db: 'ok' }`; a failed query yields HTTP 503 `{ status: 'error', db: 'down' }`.

## Migrations

The TypeORM CLI is run through `tsx` (the server is ESM + TypeScript 6; `ts-node` is not
supported for this setup). `data-source.ts` loads the repo-root `.env`, then uses the shared
options with globs `src/**/*.entity.ts` and `src/database/migrations/*.ts`. Because the CLI
diffs against a live database, `migration:generate` requires `pnpm docker:db` to be running.

Scripts on `@nudge/server`:

| Script                             | Runs                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `migration:generate --name=<Name>` | `typeorm migration:generate -d src/database/data-source.ts src/database/migrations/<Name>` |
| `migration:run`                    | `typeorm migration:run -d src/database/data-source.ts`                                     |
| `migration:revert`                 | `typeorm migration:revert -d src/database/data-source.ts`                                  |
| `migration:show`                   | `typeorm migration:show -d src/database/data-source.ts`                                    |

Root adds `db:migrate` → `pnpm --filter @nudge/server migration:run`.

The initial migration `InitialSchema` is generated from the entities, reviewed, and committed.
It creates the three enum types, five tables, FKs and indexes; `down()` drops them in reverse.

The entity/migration globs resolve for both `.ts` (source, CLI) and compiled `.js` (`dist/`),
so a later deploy-time `migration:run` against the `prod` image needs no restructuring.

## Test environment

`server/test/`:

- `global-setup.ts` — vitest `globalSetup` for the e2e config. Starts
  `postgres:17-alpine` via `@testcontainers/postgresql`, runs all migrations against it with the
  shared options, and hands the connection URL to test workers via `provide('DATABASE_URL')`
  plus `process.env`. Teardown stops the container. One container per `test:e2e` invocation.
- `create-test-app.ts` — `createTestApp()` compiles the real `AppModule` with `DATABASE_URL`
  from the global setup, returns `{ app, dataSource }`; `truncateAll(dataSource)` truncates every
  entity table with `CASCADE` for `beforeEach` isolation.
- `app.e2e-spec.ts` — existing routes, now booted through `createTestApp()`; `/health` asserts
  `db: 'ok'`.
- `database.e2e-spec.ts` — proves the entities are manageable: create a User → Friend →
  Channel + CatchUp + Nudge through repositories; load the friend with relations; enum and
  NOT NULL violations are rejected; deleting the user cascades to everything.

`vitest.config.e2e.ts` gains `globalSetup`, a longer `testTimeout`/`hookTimeout` (container
pull), and `fileParallelism: false` (one shared database). Unit tests (`*.spec.ts`) stay
database-free.

## Docs

README: replace the "server does not yet connect to the database" convention with a short
"Database & migrations" section (start db → `pnpm db:migrate`; generating a migration; e2e
tests need Docker). `.env.example` is unchanged.

## Verification

1. `pnpm install` succeeds; `pnpm lint`, `pnpm format:check`, `pnpm typecheck` pass.
2. `pnpm --filter @nudge/server test` passes (unit).
3. With `pnpm docker:db` up: `pnpm db:migrate` applies `InitialSchema`;
   `docker compose exec db psql -U nudge -c '\dt'` lists the five tables + `migrations`;
   `migration:generate` afterwards reports "No changes in database schema were found".
4. `pnpm --filter @nudge/server test:e2e` passes against a Testcontainers Postgres.
5. `pnpm docker:up`; `curl localhost:3000/health` returns `{"status":"ok","db":"ok"}`.
