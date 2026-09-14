-- Seeds a fixed-id user for local hand-testing (e.g. with the Bruno collection in bruno/).
-- Safe to re-run; idempotent on id.
--
--   docker compose exec -T db psql -U nudge -d nudge -f - < server/scripts/seed-dev-user.sql
--   # or, running the db natively via `pnpm docker:db`:
--   psql "$DATABASE_URL" -f server/scripts/seed-dev-user.sql

INSERT INTO users (id, timezone, preferred_reminder_local_time, nudge_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 'Europe/Prague', '18:00:00', true)
ON CONFLICT (id) DO NOTHING
RETURNING id, timezone, preferred_reminder_local_time, nudge_enabled, created_at;
