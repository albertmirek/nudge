# Authentication — design

Date: 2026-09-21

## Goal

Replace the dev-only `x-user-id` header with real, self-hosted authentication so the
app can ship to users: email + password sign-up with email verification, sign-in,
sign-out, forgot/reset password, and sessions that stay valid for months — a user
who opens Nudge every few weeks to catch up with friends must never be asked to sign
in again unless they were away for half a year.

The server already has the integration boundary this design plugs into:
`CurrentUserGuard` / `@CurrentUserId()` read `request.user = { id }` and every
service query is scoped to that id. Nothing in the existing controllers or services
changes; only _who sets_ `request.user` does.

## Out of scope

- Social sign-in (Apple / Google / Facebook). Planned for a later iteration. The Expo
  SDK 57 docs steer native apps to the provider SDKs (`expo-apple-authentication`,
  `@react-native-google-signin/google-signin`, `react-native-fbsdk-next`), each of which
  yields a provider ID token. That iteration adds an `identities (provider, subject, user_id)`
  table and one `POST /v1/auth/<provider>` endpoint per provider that verifies the ID
  token against the provider's JWKS with `jose` and issues the same session tokens
  described here. Nothing in this spec has to change for that; `users.password_hash`
  is nullable for exactly that reason.
- Web as a supported auth target. `react-native-web` keeps compiling (in-memory
  token fallback), but web auth is neither persisted nor tested.
- Managed auth providers (Clerk, Auth0, Firebase) and auth libraries (Better Auth) —
  rejected in favour of owning the flow inside the existing NestJS/TypeORM stack.
- Account deletion, email change, password change while signed in, 2FA, device
  management UI. All fit the data model below; none are built now.
- HTML email templates. Plain text only.
- Visual design of the auth screens. They are deliberately simple, built from the
  existing primitives, and expected to be redesigned later.

## Decisions (from brainstorming)

| Question             | Decision                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| Direction            | Own NestJS auth, email + password                                            |
| Verification & reset | Both in iteration 1, via email codes                                         |
| Session model        | 15-min JWT access token + rotating opaque refresh token                      |
| Session length       | Sliding 180-day idle window, 2-year absolute cap                             |
| Email provider       | Resend, behind an `EmailService` interface; console fallback locally         |
| Password hashing     | `scrypt` from `node:crypto` (no native deps)                                 |
| JWT library          | `jose` (reused later for provider JWKS verification)                         |
| Web                  | Native only                                                                  |
| Forms                | Simple, existing primitives, lime `#76FF2C` CTA (= `theme.colors.highlight`) |

## Server

### Data model

One migration, `AuthCredentials`, registered in `server/src/database/migrations/index.ts`.

`users` (existing) gains:

| Column              | Type                   | Notes                                                                                |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `email`             | `text NOT NULL UNIQUE` | Stored lower-cased and trimmed; the unique index is on the stored value.             |
| `email_verified_at` | `timestamptz NULL`     | Null until the verification code is consumed.                                        |
| `password_hash`     | `text NULL`            | `scrypt` PHC-style string (see Passwords). Nullable for future social-only accounts. |

The migration adds `email` with a temporary default and then drops the default, so
the existing dev user row survives (`seed` overwrites it anyway).

`refresh_tokens` (new) — one row per signed-in device:

| Column       | Type                              | Notes                                                              |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| `id`         | `uuid PK`                         |                                                                    |
| `user_id`    | `uuid FK users ON DELETE CASCADE` | indexed                                                            |
| `token_hash` | `text UNIQUE`                     | sha256 (hex) of the opaque token; the token itself is never stored |
| `created_at` | `timestamptz`                     | start of the session; drives the absolute cap                      |
| `expires_at` | `timestamptz`                     | sliding idle deadline                                              |
| `revoked_at` | `timestamptz NULL`                | set on rotation, sign-out, reset and reuse detection               |

`email_codes` (new):

| Column        | Type                                                         | Notes                      |
| ------------- | ------------------------------------------------------------ | -------------------------- |
| `id`          | `uuid PK`                                                    |                            |
| `user_id`     | `uuid FK users ON DELETE CASCADE`                            | indexed                    |
| `purpose`     | `enum email_code_purpose ('VERIFY_EMAIL', 'RESET_PASSWORD')` |                            |
| `code_hash`   | `text`                                                       | sha256 of the 6-digit code |
| `expires_at`  | `timestamptz`                                                | issue time + 15 min        |
| `attempts`    | `int NOT NULL DEFAULT 0`                                     | wrong guesses so far       |
| `consumed_at` | `timestamptz NULL`                                           |                            |
| `created_at`  | `timestamptz`                                                |                            |

Entities live in `server/src/auth/entities/` and are registered in
`server/src/database/typeorm.options.ts`, following the existing module layout.

### Module layout

```
server/src/auth/
  auth.module.ts
  auth.controller.ts        POST /v1/auth/* (public, throttled)
  auth.service.ts           flows: sign-up, verify, sign-in, refresh, sign-out, forgot, reset
  auth.middleware.ts        global: Bearer JWT → request.user = { id }
  auth-input.ts             body validation, like friends/friend-input.ts
  password.ts               hash / verify (scrypt)
  tokens.service.ts         access JWT issue/verify; refresh token issue/rotate/revoke
  email-codes.service.ts    issue / verify codes with attempt cap
  entities/refresh-token.entity.ts
  entities/email-code.entity.ts
  entities/email-code-purpose.enum.ts
server/src/email/
  email.module.ts
  email.service.ts          abstract class EmailService { send(message) }
  resend-email.service.ts
  console-email.service.ts
```

`AuthMiddleware` replaces `devAuthMiddleware`, which is deleted along with the
`x-user-id` contract. It is applied globally from `AppModule` (`configure(consumer)`),
runs on every request, and:

1. reads `Authorization: Bearer <jwt>`; absent → `next()` with no user (guards 401 later),
2. verifies signature, `exp`, `iss`/`aud` with `jose`; invalid or expired → `next()` with no
   user (the client treats the resulting 401 as "refresh and retry"),
3. sets `request.user = { id: payload.sub }`.

It never throws — deciding whether a route needs a user stays with `CurrentUserGuard`.

### Endpoints

All under `@Controller('v1/auth')`, no `CurrentUserGuard`. Rate-limited per IP with
`@nestjs/throttler`: 10 requests/minute on `sign-in`, `sign-up`, `verify-email`,
`reset-password`, `resend-verification` and `forgot-password`; 60/minute on `refresh`
and `sign-out`. Throttling is disabled in e2e tests (config flag), not bypassed by code.

| Method & path              | Body                        | Success                                                                                                                    | Failures                                                                                                                                                                                                         |
| -------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST sign-up`             | `email, password, timezone` | `201` `{}`; sends `VERIFY_EMAIL` code                                                                                      | `400` invalid input; `409` email already registered **and verified**. If the email exists but is unverified, the password is replaced and a new code is sent (`201`), so a user who abandoned sign-up can retry. |
| `POST verify-email`        | `email, code`               | `200 SessionResponse`; sets `email_verified_at`, consumes code                                                             | `400` bad code / expired / attempts exhausted (same message for all three)                                                                                                                                       |
| `POST resend-verification` | `email`                     | `204` always                                                                                                               | — (no account enumeration; silently no-ops for unknown or already-verified emails)                                                                                                                               |
| `POST sign-in`             | `email, password`           | `200 SessionResponse`                                                                                                      | `401` unknown email or wrong password (same message); `403 { code: 'EMAIL_NOT_VERIFIED' }` only after a correct password — and a fresh verification code is sent                                                 |
| `POST refresh`             | `refreshToken`              | `200 SessionResponse` with a **new** pair                                                                                  | `401` unknown, expired, revoked or over the absolute cap                                                                                                                                                         |
| `POST sign-out`            | `refreshToken`              | `204` always                                                                                                               | — (unknown token is a no-op)                                                                                                                                                                                     |
| `POST forgot-password`     | `email`                     | `204` always                                                                                                               | — (silently no-ops for unknown emails)                                                                                                                                                                           |
| `POST reset-password`      | `email, code, newPassword`  | `200 SessionResponse`; sets the password, revokes **all** the user's refresh tokens, marks the email verified if it wasn't | `400` bad/expired/exhausted code or weak password                                                                                                                                                                |

`SessionResponse`:

```json
{
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": "2026-09-21T12:15:00.000Z",
  "refreshToken": "<opaque>",
  "user": {
    "id": "…",
    "email": "…",
    "name": "",
    "timezone": "…",
    "preferredReminderLocalTime": "18:00:00",
    "nudgeEnabled": true,
    "createdAt": "…"
  }
}
```

`GET /v1/users/me` additionally returns `email` (never `passwordHash`; the entity
field is excluded from serialisation via `select: false` plus an explicit response
mapping in `UsersService.getMe`).

Invariant: **every access token belongs to a verified email.** Tokens are only issued
by `verify-email`, `sign-in` (verified accounts only) and `reset-password` (which
verifies as a side effect — the user proved control of the mailbox).

Error responses keep NestJS's default shape `{ statusCode, message, error }`; the
`403` adds `code: 'EMAIL_NOT_VERIFIED'` via a custom `ForbiddenException` body. The
client's `ApiError` exposes `code`.

Input rules (`auth-input.ts`, mirroring `friend-input.ts`): `email` trimmed,
lower-cased, ≤ 254 chars, must match a permissive `^[^\s@]+@[^\s@]+\.[^\s@]+$`;
`password` 8–128 chars, any content; `code` exactly 6 ASCII digits; `timezone` a
valid IANA zone (`Intl.supportedValuesOf('timeZone')` check, as friends/users already
rely on IANA names).

### Tokens

**Access token** — JWT, `HS256`, secret `AUTH_JWT_SECRET` (≥ 32 bytes), claims
`sub` (user id), `iat`, `exp` (= `iat` + 15 min), `iss`/`aud` = `nudge`. Stateless;
the middleware never touches the database.

**Refresh token** — 32 random bytes from `crypto.randomBytes`, base64url-encoded.
Stored as `sha256(token)`; the plaintext is returned once and never logged.

Lifecycle:

- _Issue_ (verify-email, sign-in, reset-password): new row, `created_at = now`,
  `expires_at = now + AUTH_REFRESH_IDLE_DAYS`.
- _Rotate_ (refresh): look up by hash. Reject with `401` if not found, `revoked_at`
  set, `expires_at < now`, or `created_at + AUTH_REFRESH_MAX_DAYS < now`. Otherwise
  revoke the row and insert a new one that keeps the original `created_at` (so the
  absolute cap is measured from the first sign-in) and slides `expires_at` forward.
  Rotation is a single transaction.
- _Reuse detection_: if the presented token is found but already revoked, revoke every
  refresh token of that user and return `401`. A replayed stolen token therefore ends
  all sessions instead of coexisting with the legitimate one.
- _Sign-out_: revoke that one row.
- _Reset password_: revoke all rows for the user, then issue a fresh one.

Defaults: `AUTH_REFRESH_IDLE_DAYS=180`, `AUTH_REFRESH_MAX_DAYS=730`. Both are config,
not migration-level constants.

Why this is still secure with a 6-month credential: the refresh token lives only in
the OS keychain/keystore (`expo-secure-store`), is sent only to `/v1/auth/refresh`,
is single-use, is stored hashed, and is protected by reuse detection; the token that
rides on every API call expires in 15 minutes.

### Passwords

`password.ts` wraps `crypto.scrypt` with `N=2^15, r=8, p=1`, a 16-byte random
salt and a 64-byte key, serialised as `scrypt$N$r$p$<salt b64>$<key b64>` so the
parameters can be raised later without invalidating old hashes. Verification uses
`timingSafeEqual`. When a stored hash uses weaker parameters than current ones, the
hash is upgraded on the next successful sign-in.

### Email codes

`email-codes.service.ts`:

- `issue(user, purpose)` — invalidates (consumes) any open code of the same purpose for
  that user, generates a 6-digit code from `crypto.randomInt(0, 1_000_000)` zero-padded,
  stores its sha256 with a 15-minute expiry, and sends the email. Returns nothing
  (the code leaves the server only by email).
- `consume(user, purpose, code)` — finds the newest open code; increments `attempts`
  first, then compares hashes with `timingSafeEqual`. Fails if there is no open code,
  it is expired, `attempts > 5`, or the hash differs. On success sets `consumed_at`.
  All failures surface as the same `400 'Invalid or expired code'`.

Issuing is additionally rate-limited by the endpoint throttler; there is no per-user
cooldown in this iteration.

### Email

```ts
export abstract class EmailService {
  abstract send(message: { to: string; subject: string; text: string }): Promise<void>;
}
```

- `ResendEmailService` — `fetch` to `https://api.resend.com/emails` with
  `RESEND_API_KEY` and `EMAIL_FROM`; no SDK dependency. Non-2xx → logs and throws;
  the auth endpoints let that propagate as `502`, since a sign-up whose code never
  arrives is worse than an error the user can retry.
- `ConsoleEmailService` — logs `to`, `subject` and `text` at `log` level. Selected
  automatically when `RESEND_API_KEY` is empty and `NODE_ENV !== 'production'`.
- Tests provide a `FakeEmailService` that records sent messages so e2e specs can read
  the code out of the text.

Two messages, plain text: "Your Nudge verification code is 123456. It expires in 15
minutes." and the reset equivalent. Subjects: "Verify your Nudge email" / "Reset your
Nudge password".

### Configuration

Added to `.env.example` and read via `ConfigService`:

```
AUTH_JWT_SECRET=change-me-to-32-random-bytes
AUTH_REFRESH_IDLE_DAYS=180
AUTH_REFRESH_MAX_DAYS=730
RESEND_API_KEY=
EMAIL_FROM=Nudge <no-reply@example.com>
```

On boot in `NODE_ENV=production` the server throws if `AUTH_JWT_SECRET` is shorter than
32 characters or `RESEND_API_KEY` is empty. Outside production a missing secret falls
back to a fixed dev string with a logged warning, so `pnpm docker:up` keeps working
without editing `.env`.

### Dev workflow

- `devAuthMiddleware` and the `x-user-id` header are removed from `main.ts`, the
  Bruno environment and the client.
- `pnpm db:seed` upserts the dev user with `email = dev@nudge.local`,
  `password = nudge-dev-password`, `email_verified_at = now`.
- Bruno: new `auth/` folder with `sign-up`, `verify-email`, `sign-in`, `refresh`,
  `sign-out`, `forgot-password`, `reset-password`; `sign-in` writes `accessToken` and
  `refreshToken` into the environment and the existing collection sends
  `Authorization: Bearer {{accessToken}}`.
- `docs/backend-api.md` "Authentication boundary" section is rewritten to describe the
  real flow; README gains an "Authentication" paragraph; `docs/TECHNOLOGY.md` lists Resend.

## Client

### Dependencies

`expo-secure-store` (via `expo install`). Nothing else.

### Modules

```
client/src/auth/
  token-store.ts            refresh token in SecureStore (native) / memory (web)
  token-store.web.ts        web fallback, picked by Metro's platform resolution like theme-storage.web.ts
  session.tsx               SessionProvider, useSession()
client/src/api/
  http.ts                   (changed) Bearer, lazy refresh, retry, session drop
  auth.ts                   fetch functions for the eight endpoints
  use-sign-up.ts · use-verify-email.ts · use-resend-verification.ts · use-sign-in.ts
  use-forgot-password.ts · use-reset-password.ts · use-sign-out.ts
  types.ts                  (changed) Me.email, SessionResponse, request bodies
client/src/lib/
  auth.ts                   pure validators + form helpers, like friend-form.ts
client/src/components/auth/
  sign-in-form.tsx · sign-up-form.tsx · code-form.tsx · forgot-password-form.tsx
  (+ .stories.tsx, .test.tsx, __snapshots__ each)
client/src/screens/
  sign-in-screen.tsx · sign-up-screen.tsx · verify-email-screen.tsx
  forgot-password-screen.tsx · reset-password-screen.tsx (+ tests)
client/src/app/(auth)/
  _layout.tsx · sign-in.tsx · sign-up.tsx · verify-email.tsx
  forgot-password.tsx · reset-password.tsx      thin route files
```

### Token store

```ts
getRefreshToken(): Promise<string | null>
setRefreshToken(token: string): Promise<void>
clearRefreshToken(): Promise<void>
```

Native implementation uses `expo-secure-store` with key `nudge.refreshToken` and
`keychainAccessible: AFTER_FIRST_UNLOCK` so background refreshes after a reboot work
once the device has been unlocked. The `.web.ts` variant keeps the value in a module
variable. The access token and its expiry are held in a module-level variable inside
`http.ts` and are never persisted.

### Session

`SessionProvider` (mounted in the root layout inside `QueryClientProvider`) exposes:

```ts
type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn' };
useSession(): Session & { signIn(response: SessionResponse): Promise<void>; signOut(): Promise<void> }
```

- On mount it reads the token store once. A stored refresh token means `signedIn`;
  there is **no network call at startup**, so cold start is instant and works offline.
- `signIn(response)` stores the refresh token, primes the in-memory access token and
  seeds the `['me']` query cache with `response.user`.
- `signOut()` fires `POST /sign-out` best-effort (errors ignored), clears the token
  store and access token, calls `queryClient.clear()`, and flips to `signedOut`.
- `http.ts` calls back into the session (via a registered listener) when a refresh
  definitively fails with `401`, which runs the same local teardown as `signOut()`
  without the server call.

The splash screen now waits for fonts **and** `status !== 'loading'`.

### HTTP layer

`apiFetch<T>(path, init?, options?: { auth?: boolean })` (default `auth: true`):

1. If `auth`, obtain an access token: reuse the in-memory one if it expires more than
   30 s from now; otherwise call `refreshSession()`. Attach `Authorization: Bearer`.
2. Perform the request as today.
3. On `401` with `auth` and no retry yet: `refreshSession()` and retry once.
4. `refreshSession()` is single-flight — concurrent callers await the same promise. It
   reads the refresh token from the store, calls `POST /v1/auth/refresh` with
   `auth: false`, stores the new refresh token and access token. On a `401` from
   `/refresh` it clears the store and notifies the session listener (→ `signedOut`).
   On any other failure (network, 5xx) it rethrows and leaves the session intact —
   a user with no signal stays signed in and sees react-query's cached data.
5. If no refresh token exists and `auth` is requested, throw `ApiError(401)` without a
   network call.

`ApiError` gains `code?: string` parsed from the response body. The `x-user-id`
header, `DEFAULT_DEV_USER_ID` and `EXPO_PUBLIC_DEV_USER_ID` are removed.

### Routing

Root `src/app/_layout.tsx`:

```tsx
<Stack screenOptions={…}>
  <Stack.Protected guard={session.status === 'signedIn'}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="friend/[id]" />
  </Stack.Protected>
  <Stack.Protected guard={session.status === 'signedOut'}>
    <Stack.Screen name="(auth)" />
  </Stack.Protected>
</Stack>
```

`(auth)/_layout.tsx` is a plain `Stack` (headers hidden, same background). Screen
flow:

- `sign-in` (initial) → "Create account" link → `sign-up`; "Forgot password?" →
  `forgot-password`.
- `sign-up` → on `201` → `verify-email?email=…`.
- `sign-in` with `403 EMAIL_NOT_VERIFIED` → `verify-email?email=…` (the server already
  sent a fresh code).
- `verify-email` → `code-form` with a "Resend code" secondary action → on `200` →
  `session.signIn()`; the guard flips and `(tabs)` mounts.
- `forgot-password` → on `204` → `reset-password?email=…` → `code-form` plus new
  password field → on `200` → `session.signIn()`.

Signing out (from the settings area, next to `ThemeModePicker`) flips the guard back
to `(auth)`; no manual `router.replace` anywhere.

### Forms (simple, to be redesigned)

All screens share one layout: `SafeAreaView` + `KeyboardAvoidingView` + `ScrollView`
with `theme.spacing[5]` padding, a `Text variant="title"` heading, a one-line
`Text variant="body"` subtitle in `text.secondary`, the form, and the primary
`Button` (default `highlight` variant, i.e. `#76FF2C` on `onHighlight` ink) pinned
below the fields. Secondary actions ("Create account", "Forgot password?", "Resend
code", "Back to sign in") are plain `Text` links in `theme.colors.accent`, wrapped in
`Pressable` with `accessibilityRole="link"`.

| Screen          | Heading                 | Fields                                                                                                                  | CTA              |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Sign in         | "Welcome back"          | Email (`autoComplete="email"`, `keyboardType="email-address"`), Password (`secureTextEntry`, `autoComplete="password"`) | "Sign in"        |
| Sign up         | "Create your account"   | Email, Password (`autoComplete="new-password"`), helper caption "At least 8 characters"                                 | "Create account" |
| Verify email    | "Check your inbox"      | subtitle shows the email; Code (`keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `maxLength={6}`)          | "Verify"         |
| Forgot password | "Reset your password"   | Email                                                                                                                   | "Send code"      |
| Reset password  | "Choose a new password" | Code, New password                                                                                                      | "Save password"  |

Behaviour, matching `FriendForm` / `CreateFriendScreen`:

- Fully controlled; `lib/auth.ts` provides `validateSignIn`, `validateSignUp`,
  `validateCode`, `validateResetPassword` returning `{ field?: message }` objects;
  errors show under the field via `Input`'s `error` prop and are recomputed on submit.
- The CTA shows `loading` while the mutation is in flight; the whole form is inert
  meanwhile.
- Server errors (`401` "Wrong email or password", `409` "already registered",
  `400` code errors) render as a `Text variant="caption"` in `theme.colors.danger`
  above the CTA, using `ApiError.message`.
- Password fields get a small "Show"/"Hide" toggle (text link) — cheap and it removes
  the most common sign-up typo.
- Each form component takes `values`, `errors`, `onChange`, `onSubmit`, `loading`,
  `serverError` props so stories and tests can render every state without a network.

### Timezone

Sign-up sends `Intl.DateTimeFormat().resolvedOptions().timeZone` (Hermes ships
full Intl on RN 0.86). If that is empty or throws, the form falls back to `'UTC'`.

## Testing

### Server

Unit (`vitest`, `*.spec.ts` next to the source):

- `password.spec.ts` — round trip, wrong password, tampered hash, parameter upgrade.
- `tokens.service.spec.ts` — JWT claims and expiry; refresh issue/rotate keeps
  `created_at`, slides `expires_at`; idle and absolute expiry both reject; reuse revokes
  all sessions. Uses a fake clock.
- `email-codes.service.spec.ts` — 6-digit zero-padded codes, new code invalidates the
  old, attempt cap, expiry, timing-safe compare path.
- `auth.middleware.spec.ts` — missing / malformed / expired / valid bearer.
- `auth-input.spec.ts` — validation table.

E2e (`server/test/auth-api.e2e-spec.ts`, Testcontainers Postgres, `FakeEmailService`
injected via `overrideProvider`):

- sign-up → code in fake email → verify → `/users/me` works with the access token.
- sign-in before verification → 403 + a new code; wrong password → 401 with the same
  message as unknown email.
- refresh rotates; old token → 401 and revokes the new one (reuse detection).
- forgot → reset → old refresh tokens rejected, new password signs in.
- resend/forgot for unknown emails → 204 and no email sent.
- `x-user-id` header alone → 401 on `/users/me` (regression for the removed dev path).

Existing e2e specs continue to use `createTestApp`'s trusted-context middleware, which
stays as-is (it sets `request.user` directly, bypassing the bearer middleware in tests
only).

### Client

`jest-expo` + RTL, following `docs`/README conventions:

- `api/http.test.ts` — bearer header; lazy refresh when no access token; single-flight
  refresh under concurrent calls; 401 → refresh → retry once; refresh 401 → session
  listener called and store cleared; refresh network error → rethrows, store kept;
  `auth: false` skips all of it.
- `auth/token-store.test.ts` — with `expo-secure-store` mocked.
- `auth/session.test.tsx` — loading → signedIn/signedOut from the store; `signIn`
  seeds `['me']`; `signOut` clears everything.
- `lib/auth.test.ts` — validators.
- One `*.test.tsx` per form component: renders roles/labels, validation errors,
  submit callback, loading state, server error; one snapshot on the default story.
- One test per screen with the mutation hooks mocked: happy-path navigation and error
  display.
- Stories for every form and screen state (empty, errors, loading, server error) —
  the story render test covers light/dark automatically.

## Rollout

1. Server: migration, modules, middleware, seed, Bruno, docs — mergeable on its own
   (the client keeps working only against the seed user until step 2, which is
   acceptable on a feature branch).
2. Client: token store, session, http, screens, routing.
3. Manual check on a dev build (iOS + Android) against the local Docker stack with
   `ConsoleEmailService`: sign-up, verify, kill app, reopen (still signed in), sign
   out, forgot/reset, sign in.
