# Bruno collection — Nudge API

Hand-testing collection for the NestJS server, covering the full current API surface:
health, friends, catch-ups and nudges.

## One-time setup

1. Start the stack: `pnpm docker:up` (or `pnpm docker:db` + `pnpm server:dev`).
2. Seed a fixed dev user so the collection has someone to authenticate as:
   ```
   docker compose exec -T db psql -U nudge -d nudge -f - < server/scripts/seed-dev-user.sql
   ```
3. Open this `bruno/` folder as a collection in the Bruno app (or `bru run` with the CLI),
   and select the **Local** environment.

## Auth

There's no login yet. `CurrentUserGuard` on the server just checks `request.user`, and until
now the only thing that ever set it was the e2e test harness. `server/src/common/dev-auth.middleware.ts`
adds a dev-only (`NODE_ENV !== 'production'`) middleware that trusts an `x-user-id` header —
this collection sends it on every request via the collection-level header, sourced from the
`userId` environment variable (defaults to the seeded user's fixed id).

## Chaining requests

Environment variables (`friendId`, `nudgeId`, `catchUpId`, `revision`) are populated
automatically by each request's post-response script, so the normal flow is:
Create Friend → Get/List → Create Catch-up → Snooze/Confirm Nudge, run top to bottom.

Nudge actions (snooze/confirm) use optimistic concurrency via `revision`. If it drifts
(e.g. after a periodicity change, which bumps it silently), re-run **Get Friend** to resync it.
