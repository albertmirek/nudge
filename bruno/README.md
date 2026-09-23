# Bruno collection — Nudge API

Hand-testing collection for the NestJS server, covering the full current API surface:
health, friends, catch-ups and nudges.

## One-time setup

1. Start the stack: `pnpm docker:up` (or `pnpm docker:db` + `pnpm server:dev`).
2. Seed a fixed dev user: `pnpm db:seed`.
3. Open this `bruno/` folder as a collection in the Bruno app (or `bru run` with the CLI),
   and select the **Local** environment.

## Auth

Run **Auth → Sign In** to log in with the seeded dev user (`admin@admin.cz` / `12345678`).
This stores `accessToken` and `refreshToken` in the environment; every other folder automatically
sends the bearer token on its requests.

## Chaining requests

Environment variables (`friendId`, `nudgeId`, `catchUpId`, `revision`) are populated
automatically by each request's post-response script, so the normal flow is:
Create Friend → Get/List → Create Catch-up → Snooze/Confirm Nudge, run top to bottom.

Nudge actions (snooze/confirm) use optimistic concurrency via `revision`. If it drifts
(e.g. after a periodicity change, which bumps it silently), re-run **Get Friend** to resync it.
