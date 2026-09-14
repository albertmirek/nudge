# Backend API and reusable nudges

The API stores one current nudge per friend. This is a good fit for the next reminder;
catch-ups store contact history. Delivery attempts and notification history, if needed,
should have separate records rather than being inferred from the mutable nudge.

## Routes

All bodies and responses use camelCase. Dates are ISO timestamps. IDs are UUIDs.

| Method | Route                                       | Behaviour                                                          |
| ------ | ------------------------------------------- | ------------------------------------------------------------------ |
| POST   | `/v1/friends`                               | Create a friend and its nudge atomically                           |
| GET    | `/v1/friends`                               | List the current user's friends, including each nudge and channels |
| GET    | `/v1/friends/:friendId`                     | Read one friend, including its nudge and channels                  |
| PATCH  | `/v1/friends/:friendId`                     | Edit name, periodicity or nudgeEnabled                             |
| DELETE | `/v1/friends/:friendId`                     | Delete the friend, nudge, catch-ups and channels                   |
| POST   | `/v1/friends/:friendId/catch-up`            | Record contact now, update lastContactAt and replan the nudge      |
| GET    | `/v1/friends/:friendId/catch-up`            | List catch-ups, newest first                                       |
| GET    | `/v1/friends/:friendId/catch-up/:catchUpId` | Read a catch-up                                                    |
| PATCH  | `/v1/friends/:friendId/catch-up/:catchUpId` | Edit the note without changing contact time or scheduling          |
| DELETE | `/v1/friends/:friendId/catch-up/:catchUpId` | Delete a catch-up; recalculate scheduling if last contact changes  |
| POST   | `/v1/nudges/:nudgeId/snooze`                | Add 24 hours to scheduledFor and set status to SNOOZED             |
| POST   | `/v1/nudges/:nudgeId/confirm`               | Record contact now and replan the same nudge                       |

Creation returns 201; reads, updates and nudge actions return 200; deletion returns 204.
Invalid bodies/UUIDs return 400, missing authentication returns 401, and missing or
other-user resources return 404. Stale nudge actions return 409.

Create a friend:

```json
{ "name": "Alice", "periodicity": "MONTHLY", "nudgeEnabled": true }
```

`name` and `periodicity` are required; `nudgeEnabled` defaults to true. PATCH accepts
any nonempty subset of those fields. Periodicities are WEEKLY, BIWEEKLY, MONTHLY and
QUARTERLY. Name is trimmed and limited to 200 characters.

Create a catch-up with an optional note; an empty body is also accepted:

```json
{ "note": "Caught up over coffee" }
```

PATCH requires `note`; null or an empty string clears it. Notes are limited to 10,000
characters. Contact time is server-assigned and cannot be edited. Supporting backdated
contacts would warrant a separate `occurredAt` field instead of editing `createdAt`.

Both nudge actions require the revision returned in `friend.nudge` or the last action:

```json
{ "revision": 1 }
```

Their response is the updated nudge, including `id`, `scheduledFor`, `status`,
`revision` and `lastEditedAt`. Confirmation also inserts a catch-up with a null note.
After a 409, reload the friend. Do not automatically replay the action with the newer
revision: it may refer to a different reminder. This prevents duplicate effects but
does not replay a previous successful response as an idempotency-key system would.

Unknown fields are rejected, including client-supplied ownership IDs and scheduling fields.

## Authentication boundary

Authentication remains unimplemented, as in the initial backend. All new routes fail
closed until trusted authentication middleware resolves the internal user UUID and
sets `request.user = { id }`. This property must come from verified credentials, never
an unverified header, body or query parameter. `CurrentUserGuard` checks that this context
exists; it is an integration boundary, not a token verifier.

Every service query is scoped to the owning user. A catch-up ID must also belong to
the friend in its URL. Integration tests install trusted context directly in test-only
middleware; they do not add an authentication bypass to the application.

## Scheduling rules

- Creation schedules from the friend's creation date until there is contact history.
- Catch-up creation and confirmation set `lastContactAt` to the recorded contact time.
  The next reminder is on that local date plus the friend's calendar period, at the
  user's `preferredReminderLocalTime` in their IANA `timezone`.
- WEEKLY and BIWEEKLY add 7 and 14 local calendar days. MONTHLY and QUARTERLY add
  1 and 3 calendar months, clamping to the destination month's final day when needed.
  January 31 plus one month becomes February 28, or February 29 in a leap year.
- PostgreSQL resolves the target local time to a UTC instant. This keeps an 18:00
  reminder at 18:00 through daylight-saving changes. Ambiguous or nonexistent local
  times follow PostgreSQL's timezone resolution rules.
- Snooze adds exactly 24 hours to the existing scheduled instant, as requested.
  **An overdue reminder may still be overdue after snoozing.** If the intended UX is
  always “remind me tomorrow”, change this to a day from action time or the later of
  now and the current schedule. A 24-hour snooze can also shift local wall-clock time
  at daylight-saving transitions.
- A periodicity change replans from last contact, or creation if no contact exists.
  A name change preserves the schedule. Toggling `nudgeEnabled` preserves it and
  increments its revision to invalidate old queued work. Re-enabling an overdue
  nudge makes it eligible immediately once a dispatcher exists.
- Editing a catch-up note preserves the schedule. Deleting an older catch-up does
  too. Deleting the latest restores the most recent remaining contact; deleting all
  catch-ups resets `lastContactAt` to null and plans from friend creation.

These calendar operations use PostgreSQL's documented
[date/time operators and timezone conversions](https://www.postgresql.org/docs/17/functions-datetime.html).

## State, concurrency and migrations

`status` expresses PLANNED or SNOOZED for pending work. Confirmation immediately
returns the reusable row to PLANNED for its next occurrence. SENT remains available
for the future delivery worker. The existing CONFIRMED enum value is retained for
schema compatibility but is not written by these services.

`revision` is a separate integer, starting at 1 and incremented by schedule changes
and invalidations. `last_edited_at` is exposed as `lastEditedAt` and maintained by
TypeORM on updates. Timestamps provide edit information; use the revision for
concurrency and job identity.

Mutations run in a transaction and lock the friend before the nudge, using a
consistent order. Confirmation writes the catch-up, last contact and new schedule
in that transaction. This follows PostgreSQL's
[row-locking semantics](https://www.postgresql.org/docs/17/explicit-locking.html).

Migration `1789380000000-ReusableNudge` adds the unique friend constraint, revision,
last edit timestamp and a `(status, scheduled_for)` index for polling across users.
Apply it with `pnpm db:migrate` after configuring DATABASE_URL. It has only been
applied to the disposable test database during development.

The migration deliberately fails if existing friends have multiple nudges; resolve
those duplicates explicitly before migration instead of silently deleting history.
Existing friends without a nudge are not backfilled by this migration; they get one
when contact or scheduling is changed. Plan a backfill before enabling a dispatcher
over legacy data. Existing CONFIRMED rows also need an explicit replan for reuse.

## Queue integration to implement next

The controllers do not enqueue or send notifications yet. The intended dispatcher
should query due PLANNED/SNOOZED nudges while checking both friend and user
`nudge_enabled` flags. Merely polling and enqueueing each matching row repeatedly
would produce duplicate work.

Use `(nudgeId, revision)` as the delivery occurrence identity and include it in the
job and notification action payloads. Enqueue with durable deduplication and a
transactional handoff (same-database transaction or an outbox) so a crash cannot
lose the handoff. pg-boss has
[singleton and retry options](https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md);
the exact policy should be selected when the dispatcher is implemented.

Before delivery, reload the nudge and check existence, revision, due time, status,
ownership and both enabled flags. Skip jobs for deleted, rescheduled or disabled
reminders. Coordinate claiming with the same lock order as the services. Mark SENT
only for the revision actually delivered, using a conditional update so a concurrent
reschedule cannot be overwritten. Leave its revision unchanged so notification
actions still match the delivered occurrence. Changes to user-level notification
settings will also need to invalidate affected occurrences.

External notification delivery and a database commit are separate operations. A
crash after sending but before recording success can cause a retry, so add provider
idempotency or client deduplication keyed by occurrence; do not claim exactly-once
push delivery. A notification already in flight cannot be recalled by snoozing.
Persist delivery receipts/history separately if durable audit or deduplication is
required beyond pg-boss job retention.

Before production use, add real authentication, queue workers, notification tokens,
user preference validation/update handling, legacy-data backfill and list pagination.
