# CI workflow — design

Date: 2026-09-15

## Goal

Give the repo a GitHub Actions CI workflow that gates pull requests into `main`:
lint, format check, typecheck, build, and test — for both `client` and `server` —
running only the jobs relevant to what a PR actually touches, so a client-only PR
doesn't pay for server test runs and vice versa.

## Out of scope

- Branch protection / required-status-check configuration (a GitHub repo-settings
  change, not a workflow file). `ci-gate` (below) is designed to be the single
  required check once someone configures that setting.
- Turborepo adoption. The repo has two independent packages with no shared internal
  library yet, so affected-graph filtering has nothing to walk; a directory-based
  path filter covers the stated requirement at far less setup cost. Revisit if a
  shared package (e.g. `packages/shared` for client/server DTOs) is introduced.
- CD (deploy) pipelines — this spec is CI (build/lint/test gating) only.
- Commit-message/atomic-commit enforcement in the pipeline (commitlint, PR commit
  count, etc.) — "atomic commits" here refers to how this feature itself gets
  implemented and committed, not a new CI rule.
- Native mobile builds (EAS) — `client` has no `eas.json` / build profile today.
- Bruno collection checks — `bruno/` is a manual API-exploration tool, not an
  automated test suite.

## Trigger

`pull_request` targeting `main` only. No push-triggered runs, no per-branch runs.

## Path filtering

No Turborepo (see Out of scope), so filtering is directory-based via
`dorny/paths-filter@v3` in a `changes` job, with three groups:

- `shared` — files that affect both packages: `package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`,
  `.prettierignore`, `.nvmrc`, `.github/workflows/**`
- `client` — `client/**`
- `server` — `server/**`

Downstream package jobs (`client-checks`, `server-checks`, `server-e2e`) gate on
`client || shared` and `server || shared` respectively, so a root dependency bump
or config change still runs both packages' checks, while a pure `client/**` or
`server/**` change only runs its own package's jobs. `lint-and-format` is
unconditional (see Job architecture) — a docs/bruno-only PR skips the three
package jobs but still runs `changes` and `lint-and-format`.

## Job architecture

Single workflow file: `.github/workflows/ci.yml`.

```
changes            paths-filter → outputs: client, server (booleans)
├─ lint-and-format  [unconditional — repo-wide, runs on every PR]
│                   pnpm lint && pnpm format:check
├─ client-checks    [if: client changed]
│                   pnpm --filter @nudge/client typecheck
│                   pnpm --filter @nudge/client test
├─ server-checks    [if: server changed]
│                   pnpm --filter @nudge/server typecheck
│                   pnpm --filter @nudge/server build
│                   pnpm --filter @nudge/server test        (vitest unit, *.spec.ts)
├─ server-e2e       [if: server changed]
│                   pnpm --filter @nudge/server test:e2e    (vitest e2e, testcontainers)
└─ ci-gate          [if: always(), needs: all jobs above]
                    passes only if no needed job's result is "failure" or "cancelled"
```

Rationale:

- `lint-and-format` is repo-wide, not per-package (a single flat ESLint config,
  `eslint.config.mjs`, covers both packages; splitting it would mean re-implementing
  the file-glob scoping ESLint already does internally) and unconditional (no `if:`
  gate) — `prettier --check .` covers every file in the repo, including `docs/`,
  `README.md`, and other paths outside the `client`/`server`/`shared` filter groups,
  so gating it on those groups would let a docs-only PR merge unformatted content
  that breaks the next PR to touch a package. It's the cheapest job in the file
  (~1 minute), so running it unconditionally costs little.
- `server-checks` bundles typecheck + build + unit test into one job — all fast,
  no Docker — instead of three jobs, to avoid job-spawn overhead for cheap
  sequential steps.
- `server-e2e` is its own job, parallel to `server-checks`, because it's the slow
  path (spins up a real Postgres via testcontainers) and shouldn't serialize behind
  the fast checks.
- `client-checks` bundles typecheck + test; client has no separate build step
  today (see Out of scope — no EAS config), so "build" for client is typecheck.
- `ci-gate` exists because GitHub Actions branch protection handles _skipped_
  required jobs inconsistently; a single always-run gate job that inspects the
  results of its dependencies is the standard workaround, and gives future branch
  protection setup one check to require instead of five.

## Server e2e requirements

`server-e2e` needs nothing beyond Docker, which `ubuntu-latest` runners have
preinstalled: `server/test/global-setup.ts` uses `@testcontainers/postgresql` to
start its own ephemeral `postgres:17-alpine` container, run migrations, and hand the
connection URL to test workers via `setup-env.ts`. No `services:` block, no `.env`
file, no docker-compose involvement.

## Tooling

- `actions/checkout@v5`
- `pnpm/action-setup@v4` — reads the `packageManager` field from `package.json`
  (`pnpm@11.23.0`), no version hardcoded in the workflow
- `actions/setup-node@v5` — `node-version-file: .nvmrc`, `cache: pnpm` (built-in
  lockfile-keyed dependency caching; no separate `actions/cache` step)
- `pnpm install --frozen-lockfile`
- Actions pinned to major-version tags (`@v5`, `@v4`, `@v3`), not `@main` or full SHAs

## Implementation note

Build the workflow in small, separately-committed logical increments (skeleton +
`changes` job, then `lint-and-format`, then `client-checks`, then `server-checks`,
then `server-e2e`, then `ci-gate`) rather than one large commit — this is about how
the feature is built, not a new CI-enforced rule.
