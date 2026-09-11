# Nudge Monorepo Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `nudge/` directory into a pnpm monorepo with a startable Expo client, a bare NestJS server with `/health`, Postgres + server under Docker Compose, and unified ESLint/Prettier + git hooks.

**Architecture:** Two workspace packages (`client`, `server`) under a root that owns all lint/format tooling. The server is containerised with a multi-stage Dockerfile built from the repo root; the client only runs natively. No DB connection code is written.

**Tech Stack:** pnpm 11, Node 22, Expo SDK (latest, expo-router, TS), NestJS 11, ESLint 9 flat config, typescript-eslint, Prettier 3, husky, lint-staged, Docker Compose v2, postgres:17-alpine.

**Spec:** `docs/superpowers/specs/2026-09-11-monorepo-init-design.md`

## Global Constraints

- Package manager: pnpm, `packageManager: "pnpm@11.23.0"`, `engines.node: ">=22"`.
- `.npmrc` must contain `node-linker=hoisted`.
- Package names: `@nudge/client`, `@nudge/server`.
- ESLint config lives only at root (`eslint.config.mjs`); packages carry no ESLint config files.
- Prettier: `singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 100`.
- Server never opens a DB connection in this plan.
- Every task ends with `pnpm lint && pnpm format:check` passing once Task 4 exists.

---

### Task 1: Root workspace skeleton

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example`, `tsconfig.base.json`, `.prettierrc`, `.prettierignore`

**Interfaces:**

- Produces: `tsconfig.base.json` that Tasks 2 and 3 extend; `.env.example` variable names used by Task 5.

- [ ] **Step 1: Write root manifests**

`package.json`:

```json
{
  "name": "nudge",
  "private": true,
  "packageManager": "pnpm@11.23.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "client:start": "pnpm --filter @nudge/client start",
    "client:ios": "pnpm --filter @nudge/client ios",
    "client:android": "pnpm --filter @nudge/client android",
    "server:dev": "pnpm --filter @nudge/server start:dev",
    "docker:up": "docker compose up --build -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f",
    "docker:db": "docker compose up -d db",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - client
  - server
```

`.npmrc`:

```
node-linker=hoisted
```

`.nvmrc`: `22`

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

`.prettierrc`:

```json
{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }
```

`.prettierignore`: `node_modules`, `dist`, `.expo`, `pnpm-lock.yaml`, `docs/.idea`, `docs/*.drawio*`, `**/ios`, `**/android`.

`.editorconfig`: utf-8, lf, 2-space indent, trim trailing whitespace, final newline.

`.gitignore`: `node_modules/`, `dist/`, `.expo/`, `expo-env.d.ts`, `.env`, `*.log`, `.DS_Store`, `docs/.idea/`, `coverage/`, `client/ios/`, `client/android/`.

`.env.example`:

```
POSTGRES_USER=nudge
POSTGRES_PASSWORD=nudge
POSTGRES_DB=nudge
PORT=3000
DATABASE_URL=postgresql://nudge:nudge@db:5432/nudge
```

- [ ] **Step 2: Verify pnpm accepts the workspace**

Run: `pnpm install`
Expected: exits 0, creates `pnpm-lock.yaml` (no packages yet).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: bootstrap pnpm workspace skeleton"
```

---

### Task 2: NestJS server with /health

**Files:**

- Create: `server/` via `pnpm dlx @nestjs/cli@latest new server --package-manager pnpm --strict --skip-git`
- Modify: `server/package.json` (name, add `typecheck`, remove eslint/prettier devDeps and `lint`/`format` scripts that reference local configs)
- Delete: `server/eslint.config.mjs`, `server/.prettierrc`
- Modify: `server/tsconfig.json` to extend `../tsconfig.base.json`
- Create: `server/src/health/health.controller.ts`, `server/src/health/health.controller.spec.ts`
- Modify: `server/src/app.module.ts`, `server/src/main.ts`

**Interfaces:**

- Produces: `GET /health` → `{ "status": "ok" }`; server listens on `process.env.PORT ?? 3000`.

- [ ] **Step 1: Scaffold** — run the `nest new` command above from the repo root.
- [ ] **Step 2: Write the failing test** `server/src/health/health.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    const controller = moduleRef.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 3: Run** `pnpm --filter @nudge/server test` → FAIL (module not found).
- [ ] **Step 4: Implement** `health.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
```

Register in `AppModule.controllers`. Add `ConfigModule.forRoot({ isGlobal: true })` (`pnpm --filter @nudge/server add @nestjs/config`). In `main.ts`: `await app.listen(process.env.PORT ?? 3000)`.

- [ ] **Step 5: Run** tests + `pnpm --filter @nudge/server typecheck` (`tsc --noEmit -p tsconfig.json`) → PASS.
- [ ] **Step 6: Commit** `feat(server): scaffold NestJS app with /health endpoint`.

---

### Task 3: Expo client

**Files:**

- Create: `client/` via `pnpm dlx create-expo-app@latest client --no-install`
- Modify: `client/package.json` (name `@nudge/client`, add `typecheck`, remove `lint` script & eslint config)
- Delete: `client/eslint.config.js`
- Create: `client/metro.config.js`
- Modify: `client/tsconfig.json` to extend `../tsconfig.base.json` then `expo/tsconfig.base`

**Interfaces:**

- Produces: `pnpm client:start` boots Metro.

- [ ] **Step 1: Scaffold** with the command above; `pnpm install` from root.
- [ ] **Step 2: Write** `client/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

- [ ] **Step 3: Verify** `pnpm --filter @nudge/client typecheck` (`tsc --noEmit`) and `pnpm --filter @nudge/client exec expo export --platform web` → both exit 0. Delete the generated `client/dist`.
- [ ] **Step 4: Commit** `feat(client): scaffold Expo app with monorepo metro config`.

---

### Task 4: Unified ESLint + Prettier

**Files:**

- Create: `eslint.config.mjs`
- Modify: root `package.json` devDependencies

- [ ] **Step 1: Install** at root: `pnpm add -wD eslint @eslint/js typescript typescript-eslint eslint-config-prettier eslint-config-expo prettier globals`.
- [ ] **Step 2: Write** `eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      'docs/**',
      'client/ios/**',
      'client/android/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['client/**/*.{js,jsx,ts,tsx}'], extends: [expoConfig] },
  {
    files: ['server/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
  prettier,
);
```

- [ ] **Step 3: Run** `pnpm lint`, `pnpm format` then `pnpm format:check` → all exit 0. Fix any reported issues in scaffolded code.
- [ ] **Step 4: Commit** `chore: unify eslint and prettier at workspace root`.

---

### Task 5: Docker Compose for server + Postgres

**Files:**

- Create: `server/Dockerfile`, `.dockerignore`, `docker-compose.yml`

- [ ] **Step 1: Write** `server/Dockerfile` (context = repo root):

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --filter @nudge/server...

FROM deps AS dev
COPY tsconfig.base.json ./
COPY server ./server
WORKDIR /app/server
CMD ["pnpm", "start:dev"]

FROM deps AS build
COPY tsconfig.base.json ./
COPY server ./server
RUN pnpm --filter @nudge/server build \
 && pnpm --filter @nudge/server deploy --prod --legacy /out

FROM node:22-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
COPY --from=build /app/server/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Write** `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    env_file: .env
    ports: ['5432:5432']
    volumes: ['nudge_pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}']
      interval: 5s
      timeout: 3s
      retries: 10
  server:
    build: { context: ., dockerfile: server/Dockerfile, target: dev }
    env_file: .env
    ports: ['3000:3000']
    volumes: ['./server/src:/app/server/src']
    depends_on:
      db: { condition: service_healthy }
volumes:
  nudge_pgdata:
```

- [ ] **Step 3: Verify** `cp .env.example .env && pnpm docker:up`; wait; `curl -s localhost:3000/health` → `{"status":"ok"}`; `docker compose exec db pg_isready` → accepting connections; `docker build -f server/Dockerfile --target prod .` exits 0; `pnpm docker:down`.
- [ ] **Step 4: Commit** `feat: dockerize server and postgres with docker compose`.

---

### Task 6: Git hooks + README

**Files:**

- Create: `.husky/pre-commit`, `README.md`
- Modify: root `package.json` (`prepare`, `lint-staged`)

- [ ] **Step 1: Install** `pnpm add -wD husky lint-staged && pnpm exec husky init`; set `.husky/pre-commit` to `pnpm exec lint-staged`. Add to `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx,js,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

- [ ] **Step 2: Write** `README.md` covering prerequisites, layout, and every root script from Task 1.
- [ ] **Step 3: Verify** the hook: stage a deliberately mis-formatted `.ts` file, commit, confirm it was reformatted; then discard the test file.
- [ ] **Step 4: Final verification** — run the spec's full checklist: `pnpm install`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm docker:up` + curl, `expo export`.
- [ ] **Step 5: Commit** `chore: add husky/lint-staged hooks and README`.
