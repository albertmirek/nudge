# Nudge monorepo initialization — design

Date: 2026-09-11

## Goal

Initialize the Nudge repository as a pnpm monorepo containing a startable Expo
client app and a bare NestJS server, with the server and PostgreSQL runnable
locally via Docker Compose. Establish unified lint/format tooling and standard
fresh-repo hygiene. No product features are in scope.

## Out of scope

- Any ORM / database connection from the server (no ORM chosen yet).
- pg-boss integration, notification provider, auth, domain modules.
- Turborepo or other task runners (plain pnpm workspaces suffice for two packages).
- CI configuration and Render deployment config.

## Repository layout

```
nudge/
├── client/                 # Expo app (expo-router + TypeScript), package @nudge/client
├── server/                 # NestJS app, package @nudge/server
│   └── Dockerfile          # multi-stage: dev (watch) and prod (pnpm deploy) targets
├── docs/                   # existing design docs; docs/.idea ignored by git
├── docker-compose.yml      # db (postgres) + server (dev target)
├── pnpm-workspace.yaml     # packages: client, server
├── package.json            # private root; scripts + shared devDependencies
├── eslint.config.mjs       # single flat config for the whole workspace
├── .prettierrc / .prettierignore
├── tsconfig.base.json      # shared strict compiler options; packages extend it
├── .editorconfig, .nvmrc (22), .npmrc, .gitignore, .env.example, README.md
└── .husky/pre-commit       # runs lint-staged
```

## Tooling

- **Package manager:** pnpm 11 (`packageManager` pinned in root `package.json`),
  Node >= 22 (`engines`, `.nvmrc`).
- **`.npmrc`:** `node-linker=hoisted`. Expo/Metro does not resolve pnpm's
  symlinked `node_modules` reliably; hoisting is Expo's documented setup for pnpm
  monorepos. `client/metro.config.js` adds the workspace root to `watchFolders`
  and both `node_modules` dirs to `nodeModulesPaths`.
- **ESLint 9 flat config** at root: `@eslint/js` + `typescript-eslint` +
  `eslint-config-prettier` as the shared base; a `client/**` block layering
  `eslint-config-expo`; a `server/**` block with type-aware rules using the
  server tsconfig. Packages do not carry their own ESLint config.
- **Prettier 3** is the only formatter; ESLint defers to it via
  `eslint-config-prettier`. Config: single quotes, semicolons, trailing commas
  `all`, print width 100.
- **Git hooks:** husky + lint-staged. Pre-commit runs `eslint --fix` on
  `*.{ts,tsx,js,mjs}` and `prettier --write` on `*.{ts,tsx,js,mjs,json,md,yml,yaml}`.
- **Shared TS base:** `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`,
  `esModuleInterop`, `skipLibCheck`. Each package extends it with its own
  `module`/`target`/`jsx` settings appropriate to its runtime.

## Client (`client/`)

- Scaffolded with `create-expo-app` default template (expo-router, TypeScript,
  tabs example), renamed to `@nudge/client`.
- Runs natively on the host only (Expo is not containerised).
- Scripts: `start`, `ios`, `android`, `web`, `lint`, `typecheck`.

## Server (`server/`)

- Scaffolded with `@nestjs/cli` (`nest new --package-manager pnpm --strict`),
  renamed to `@nudge/server`.
- Adds `GET /health` returning `{ status: 'ok' }`. Keeps the default
  `AppController` hello route.
- Reads `PORT` (default 3000) and `DATABASE_URL` from env via `@nestjs/config`,
  but does not open a DB connection.
- Scripts: `start:dev`, `build`, `start:prod`, `lint`, `typecheck`, `test`.

## Docker

- `server/Dockerfile` (context = repo root so the workspace lockfile is available):
  - `base`: `node:22-alpine`, enables pnpm via corepack.
  - `deps`: copies root manifests + `server/package.json`, runs
    `pnpm install --frozen-lockfile --filter @nudge/server...`.
  - `dev`: from `deps`, copies `server/`, `CMD pnpm --filter @nudge/server start:dev`.
  - `build`: from `deps`, copies `server/`, runs `pnpm --filter @nudge/server build`,
    then `pnpm --filter @nudge/server deploy --prod /out`.
  - `prod`: `node:22-alpine`, copies `/out` from `build`, `CMD node dist/main.js`.
- `docker-compose.yml`:
  - `db`: `postgres:17-alpine`, env from `.env`, named volume `nudge_pgdata`,
    `pg_isready` healthcheck, port `5432:5432`.
  - `server`: builds `server/Dockerfile` target `dev`, bind-mounts `./server/src`
    for hot reload, `depends_on: db: condition: service_healthy`, port
    `3000:3000`, `DATABASE_URL` pointing at `db`.
- `.env.example` documents `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
  `PORT`, `DATABASE_URL`.

## Root scripts

| Script | Runs |
| --- | --- |
| `client:start` / `client:ios` / `client:android` | `pnpm --filter @nudge/client <start|ios|android>` |
| `server:dev` | `pnpm --filter @nudge/server start:dev` (native, against `docker:db`) |
| `docker:up` / `docker:down` / `docker:logs` | `docker compose up --build -d` / `down` / `logs -f` |
| `docker:db` | `docker compose up -d db` |
| `lint` / `format` / `typecheck` | `eslint .` / `prettier --write .` / `pnpm -r typecheck` |
| `format:check` | `prettier --check .` |

## Verification (must pass before the initial commit)

1. `pnpm install` completes with a single lockfile at the root.
2. `pnpm lint`, `pnpm format:check`, `pnpm typecheck` all pass.
3. `pnpm --filter @nudge/server test` passes.
4. `docker compose up --build -d`; `curl localhost:3000/health` returns
   `{"status":"ok"}`; `docker compose exec db pg_isready` reports accepting connections.
5. `pnpm --filter @nudge/client exec expo export --platform web` succeeds
   (proves the bundle builds without a simulator).
6. `git init`, initial commit; pre-commit hook fires.

## Git hygiene

`.gitignore` covers `node_modules`, `dist`, `.expo`, `.env`, `*.log`,
`.DS_Store`, and `docs/.idea/`. Existing `.DS_Store` and `docs/.idea/` files are
left on disk, just untracked.
