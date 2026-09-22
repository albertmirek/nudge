# Nudge

Reminds you to keep in touch with your long-distance friends.

pnpm monorepo with an Expo mobile app, a NestJS API and PostgreSQL. Design docs live in
[`docs/`](docs/) (see [`docs/TECHNOLOGY.md`](docs/TECHNOLOGY.md) and
[`docs/images/System_design.png`](docs/images/System_design.png)).

## Layout

| Path                     | Package         | What                                                       |
| ------------------------ | --------------- | ---------------------------------------------------------- |
| `client/`                | `@nudge/client` | Expo app (expo-router, TypeScript). Runs on the host.      |
| `client/src/theme/`      | —               | Design tokens + persisted light/dark `ThemeProvider`.      |
| `client/src/ui/`         | —               | Generic primitives (`Text`, `Button`, `Input`, `Icon`, …). |
| `client/src/components/` | —               | App-specific compositions (`ContactRow`, `FriendForm`, …). |
| `client/src/app/(tabs)/` | —               | expo-router tab routes: friend book, add a friend, home.   |
| `client/src/app/friend/` | —               | `/friend/:friendId` — a friend's profile and notes.        |
| `server/`                | `@nudge/server` | NestJS API. Runs in Docker (or natively).                  |
| `docker-compose.yml`     | —               | Local backend stack: `db` (PostgreSQL 17) + `server`.      |
| `eslint.config.mjs`      | —               | Single ESLint config for the whole repo (+ Prettier).      |
| `tsconfig.base.json`     | —               | Shared strict TypeScript options; packages extend it.      |
| `docs/`                  | —               | Diagrams, tech notes, design specs and plans.              |

## Prerequisites

- Node 22 (`.nvmrc`) and pnpm 11 (`corepack enable` picks the pinned version from `package.json`)
- Docker Desktop (Compose v2)
- For the mobile app: Xcode / Android Studio, or the Expo Go app on a device

## Setup

```bash
pnpm install
cp .env.example .env   # adjust if the default ports clash with something local
```

`pnpm install` also installs the git hooks (husky + lint-staged), which run ESLint and
Prettier on staged files before every commit.

## Backend (Docker)

| Command            | What                                                          |
| ------------------ | ------------------------------------------------------------- |
| `pnpm docker:up`   | Build and start PostgreSQL + the NestJS server (hot reload)   |
| `pnpm docker:logs` | Follow container logs                                         |
| `pnpm docker:down` | Stop everything (the database volume is kept)                 |
| `pnpm docker:db`   | Start only PostgreSQL                                         |
| `pnpm server:dev`  | Run the server natively in watch mode (pair with `docker:db`) |

The server listens on `http://localhost:3000`; `GET /health` returns `{"status":"ok","db":"ok"}`.
Friend and catch-up CRUD plus nudge actions are documented in
[`docs/backend-api.md`](docs/backend-api.md), including the authentication boundary and scheduling rules.
`server/src` is bind-mounted into the container, so edits restart the server automatically.
Adding a dependency to the server requires `pnpm docker:up` again to rebuild the image.

`server/Dockerfile` also has a `prod` target (`docker build -f server/Dockerfile --target prod .`)
that produces the slim image used for deployment.

### Authentication

After `pnpm db:seed`, sign in with `dev@nudge.local` / `nudge-dev-password`. Accounts use email

- password (scrypt); tokens are issued only to verified emails. See [`docs/backend-api.md`](docs/backend-api.md)
  for token formats, expiry, rate-limiting and environment variables (`RESEND_API_KEY`, `EMAIL_FROM`).

### Database & migrations

The server uses TypeORM with `synchronize` off — the schema only changes through migrations in
`server/src/database/migrations/`.

| Command                                                 | What                                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:migrate`                                       | Apply pending migrations to `DATABASE_URL` (from `.env`)                                                              |
| `pnpm db:seed`                                          | Dev data: the default dev user + friends with overdue and upcoming nudges (re-runnable; replaces that user's friends) |
| `pnpm --filter @nudge/server migration:generate <Name>` | Diff entities against the database → new migration file                                                               |
| `pnpm --filter @nudge/server migration:revert`          | Roll back the last migration                                                                                          |
| `pnpm --filter @nudge/server migration:show`            | List applied / pending migrations                                                                                     |

After generating a migration, add its class to `server/src/database/migrations/index.ts` and
review the SQL. `migration:generate` needs a running database (`pnpm docker:db`).

Entities live in their feature module (`server/src/<module>/entities/*.entity.ts`) and are
registered in `server/src/database/typeorm.options.ts`.

E2e tests (`pnpm --filter @nudge/server test:e2e`) start a throwaway `postgres:17-alpine`
container via Testcontainers and run all migrations into it, so they need Docker running but
never touch your dev database.

## Mobile client (Expo)

| Command               | What                                     |
| --------------------- | ---------------------------------------- |
| `pnpm client:start`   | Start Metro; pick a target from the menu |
| `pnpm client:ios`     | Start and open the iOS simulator         |
| `pnpm client:android` | Start and open the Android emulator      |

Expo runs on the host, not in Docker, because it needs the simulators and the Metro dev server
talking to a physical device.

## Design system & Storybook

Components are built from typed theme tokens (`client/src/theme`) with plain `StyleSheet`; every
component folder holds the component, its `*.stories.tsx` and its test. `useTheme()` /
`useStyles()` read the active theme; `useThemeMode().setMode('dark' | 'light' | 'system')`
changes it and the choice is persisted (`expo-sqlite/kv-store` on device, `localStorage` on web).

| Command                  | What                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm storybook`         | Web Storybook (react-native-web + Vite) at http://localhost:6006 |
| `pnpm storybook:ios`     | Boot the Expo app into the on-device Storybook (iOS simulator)   |
| `pnpm storybook:android` | Same, Android emulator                                           |

Both runtimes read the same `src/**/*.stories.tsx`. The "Scheme" toolbar in the web UI switches
light/dark; on device, `system` follows the simulator's appearance setting.

## Frontend testing

`pnpm test` runs `jest-expo` + React Native Testing Library in `client/`:

- **Story render tests** — every story is rendered in light and dark via Storybook portable stories (`describeStories`), so a new story is a new test.
- **Behaviour tests** — RTL queries and `userEvent` assert roles, accessibility state and callbacks (e.g. pressing a checkbox calls `onCheckedChange`).
- **Snapshot tests** — exactly one `toMatchSnapshot()` per component, on its default story, to catch unintended structural changes.
- **Not covered yet** — pixel/visual regression and end-to-end flows (Maestro); the story setup leaves room for both.

## Quality

| Command             | What                                                         |
| ------------------- | ------------------------------------------------------------ |
| `pnpm lint`         | ESLint across the repo                                       |
| `pnpm format`       | Prettier — write                                             |
| `pnpm format:check` | Prettier — check only (what CI should run)                   |
| `pnpm typecheck`    | `tsc --noEmit` in every package                              |
| `pnpm test`         | Unit tests in every package (`vitest` server, `jest` client) |

Package-specific scripts can be run with `pnpm --filter @nudge/<pkg> <script>`, e.g.
`pnpm --filter @nudge/server test:e2e`.

## Conventions

- ESLint and Prettier are configured **only at the root**. Packages do not carry their own
  config; add per-package overrides to `eslint.config.mjs`.
- pnpm uses the hoisted `node_modules` layout (`pnpm-workspace.yaml`) because Metro cannot
  follow pnpm's symlinked store. Expo's ecosystem is exempt from pnpm's minimum-release-age
  policy for the same reason `expo install` pins fresh patch versions.
- `GET /health` pings the database (`SELECT 1`) and answers `{"status":"ok","db":"ok"}`, or
  HTTP 503 when Postgres is unreachable.
