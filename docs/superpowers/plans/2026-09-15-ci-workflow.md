# CI Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that lints, typechecks, builds, and tests `client` and `server` on every pull request into `main`, running only the jobs relevant to what changed.

**Architecture:** One workflow file, built incrementally job-by-job. A `changes` job (via `dorny/paths-filter`) computes `client`/`server` booleans (true if that package's directory changed, or if a shared root config file changed). Five downstream jobs — `lint-and-format`, `client-checks`, `server-checks`, `server-e2e`, and a final `ci-gate` — each gate on those booleans via `if:`. `ci-gate` is the single check meant to be marked required in branch protection later.

**Tech Stack:** GitHub Actions, `dorny/paths-filter@v3`, `pnpm/action-setup@v4`, `actions/setup-node@v5` (with built-in pnpm caching), pnpm workspaces, Jest (client), Vitest + testcontainers (server).

**Spec:** `docs/superpowers/specs/2026-09-15-ci-workflow-design.md`

## Global Constraints

- Trigger is `pull_request` targeting `main` only — no push-triggered or per-branch runs.
- Actions are pinned to major-version tags (`@v5`, `@v4`, `@v3`) — never `@main` or unpinned.
- pnpm version comes from `package.json`'s `packageManager` field (`pnpm@11.23.0`) via `pnpm/action-setup@v4` — never hardcoded in the workflow.
- Node version comes from `.nvmrc` via `actions/setup-node@v5`'s `node-version-file` input — never hardcoded.
- `server-e2e` needs nothing beyond Docker (present by default on `ubuntu-latest`): testcontainers manages its own ephemeral Postgres via `server/test/global-setup.ts`. No `services:` block, no `.env` file.
- Client has no build step (no EAS config exists) — client's checks are typecheck + test only.
- No Turborepo, no branch-protection changes, no commit-message enforcement — all explicitly out of scope per the spec.

---

### Task 1: Workflow skeleton + `changes` job

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Produces: job `changes` with outputs `client` (string `'true'`/`'false'`) and `server` (string `'true'`/`'false'`). All later tasks read these as `needs.changes.outputs.client` / `needs.changes.outputs.server`.

- [ ] **Step 1: Write the workflow skeleton with the `changes` job**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  changes:
    name: Detect changes
    runs-on: ubuntu-latest
    outputs:
      client: ${{ steps.filter.outputs.client == 'true' || steps.filter.outputs.shared == 'true' }}
      server: ${{ steps.filter.outputs.server == 'true' || steps.filter.outputs.shared == 'true' }}
    steps:
      - uses: actions/checkout@v5
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            shared:
              - 'package.json'
              - 'pnpm-lock.yaml'
              - 'pnpm-workspace.yaml'
              - 'tsconfig.base.json'
              - 'eslint.config.mjs'
              - '.prettierrc'
              - '.prettierignore'
              - '.nvmrc'
              - '.github/workflows/**'
            client:
              - 'client/**'
            server:
              - 'server/**'
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workflow skeleton with path-filter change detection"
```

---

### Task 2: `lint-and-format` job

**Files:**

- Modify: `.github/workflows/ci.yml` (append job after `changes`)

**Interfaces:**

- Consumes: `needs.changes.outputs.client`, `needs.changes.outputs.server` (from Task 1)
- Produces: job `lint-and-format`

- [ ] **Step 1: Append the `lint-and-format` job**

Open `.github/workflows/ci.yml`. After the `changes` job's last line (`              - 'server/**'`), add a blank line and this job (same indentation level as `changes:`, i.e. 2 spaces under `jobs:`):

<!-- prettier-ignore -->
```yaml

  lint-and-format:
    name: Lint & format
    needs: changes
    if: needs.changes.outputs.client == 'true' || needs.changes.outputs.server == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Sanity-check the commands locally**

Run: `pnpm lint && pnpm format:check`
Expected: both exit 0 (these are the exact commands the job runs; confirming they pass locally now avoids debugging a CI-only failure later)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint-and-format job"
```

---

### Task 3: `client-checks` job

**Files:**

- Modify: `.github/workflows/ci.yml` (append job after `lint-and-format`)

**Interfaces:**

- Consumes: `needs.changes.outputs.client` (from Task 1)
- Produces: job `client-checks`

- [ ] **Step 1: Append the `client-checks` job**

After the `lint-and-format` job's last line (`      - run: pnpm format:check`), add:

<!-- prettier-ignore -->
```yaml

  client-checks:
    name: Client checks
    needs: changes
    if: needs.changes.outputs.client == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nudge/client typecheck
      - run: pnpm --filter @nudge/client test
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Sanity-check the commands locally**

Run: `pnpm --filter @nudge/client typecheck && pnpm --filter @nudge/client test`
Expected: both exit 0

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add client-checks job"
```

---

### Task 4: `server-checks` job

**Files:**

- Modify: `.github/workflows/ci.yml` (append job after `client-checks`)

**Interfaces:**

- Consumes: `needs.changes.outputs.server` (from Task 1)
- Produces: job `server-checks`

- [ ] **Step 1: Append the `server-checks` job**

After the `client-checks` job's last line (`      - run: pnpm --filter @nudge/client test`), add:

<!-- prettier-ignore -->
```yaml

  server-checks:
    name: Server checks
    needs: changes
    if: needs.changes.outputs.server == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nudge/server typecheck
      - run: pnpm --filter @nudge/server build
      - run: pnpm --filter @nudge/server test
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Sanity-check the commands locally**

Run: `pnpm --filter @nudge/server typecheck && pnpm --filter @nudge/server build && pnpm --filter @nudge/server test`
Expected: all exit 0 (`test` here is the unit suite — `vitest run` with default config, matching only `**/*.spec.ts`, not the e2e suite)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add server-checks job"
```

---

### Task 5: `server-e2e` job

**Files:**

- Modify: `.github/workflows/ci.yml` (append job after `server-checks`)

**Interfaces:**

- Consumes: `needs.changes.outputs.server` (from Task 1)
- Produces: job `server-e2e`

- [ ] **Step 1: Append the `server-e2e` job**

After the `server-checks` job's last line (`      - run: pnpm --filter @nudge/server test`), add:

<!-- prettier-ignore -->
```yaml

  server-e2e:
    name: Server e2e
    needs: changes
    if: needs.changes.outputs.server == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nudge/server test:e2e
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Sanity-check the command locally**

Run: `docker info >/dev/null 2>&1 && echo "docker ok" || echo "docker unavailable — skipping local e2e sanity check"`
If docker is available, also run: `pnpm --filter @nudge/server test:e2e`
Expected: `docker ok`, and if run, the e2e suite exits 0 (this pulls `postgres:17-alpine` via testcontainers and runs real migrations — same as what CI will do)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add server-e2e job"
```

---

### Task 6: `ci-gate` job

**Files:**

- Modify: `.github/workflows/ci.yml` (append job after `server-e2e`)

**Interfaces:**

- Consumes: jobs `changes`, `lint-and-format`, `client-checks`, `server-checks`, `server-e2e` (from Tasks 1-5) — reads their `result` via the `needs` context
- Produces: job `ci-gate` — the single check intended to be marked required in future branch-protection configuration (out of scope for this plan; see spec)

- [ ] **Step 1: Append the `ci-gate` job**

After the `server-e2e` job's last line (`      - run: pnpm --filter @nudge/server test:e2e`), add:

<!-- prettier-ignore -->
```yaml

  ci-gate:
    name: CI gate
    if: always()
    needs: [changes, lint-and-format, client-checks, server-checks, server-e2e]
    runs-on: ubuntu-latest
    steps:
      - name: Fail if any required job failed or was cancelled
        if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
        run: exit 1
```

- [ ] **Step 2: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add ci-gate job as the single required-check target"
```

---

### Task 7: End-to-end validation on a real PR

**Files:** none (validation only)

**Interfaces:**

- Consumes: the complete `.github/workflows/ci.yml` from Tasks 1-6

This task pushes the branch and opens a real PR against `main` — a visible, shared-state action. **Get explicit user confirmation before Step 1.**

- [ ] **Step 1: Push the branch**

```bash
git push -u origin ci-workflow
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "ci: add path-filtered CI workflow" --body "$(cat <<'EOF'
## Summary
- Adds .github/workflows/ci.yml: lint/format, client typecheck+test, server typecheck+build+test, server e2e, gated by dorny/paths-filter so only affected packages run.
- Adds the design spec this implements.

## Test plan
- [ ] All jobs in the Actions run for this PR complete (this PR touches .github/workflows/** and docs/, which fall under the "shared" filter, so every job should run, not skip).
- [ ] ci-gate passes.
EOF
)"
```

- [ ] **Step 3: Watch the run to completion**

```bash
gh pr checks --watch
```

Expected: `changes`, `lint-and-format`, `client-checks`, `server-checks`, `server-e2e`, and `ci-gate` all report success (this PR's diff includes `.github/workflows/ci.yml` itself, which is in the `shared` filter group, so both `client` and `server` outputs are `true` and every job runs — this is the correct way to validate the full pipeline end-to-end in one PR).

- [ ] **Step 4: Report the result**

Summarize the run outcome (job list + pass/fail) back to the user. If anything failed, diagnose from the `gh pr checks` / `gh run view --log-failed` output before making further changes — do not just re-push blindly.
