# Friend Channels (Deep Links) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user store ways to reach each friend (WhatsApp, Instagram, Messenger, …), open the conversation with one tap, and have that tap record contact and replan the nudge.

**Architecture:** The server stores `type` + `handle` per channel and derives a never-expiring `link` in one pure function (`channelLink`), exposed as a computed entity property. A new `POST …/channels/:channelId/open` route records contact through a shared `NudgeSchedulingService.recordContact`. The Expo client adds a "Contact via" list on the friend screen and a platform-first `ChannelModal` that resolves pasted links, clipboard contents and picked contacts into a handle the user confirms.

**Tech Stack:** NestJS 12 + TypeORM 1 + PostgreSQL 17 (vitest, Testcontainers e2e); Expo SDK 57 / React Native 0.86, TanStack Query 5, Jest + RNTL 14, Storybook 10; new client deps `libphonenumber-js`, `expo-localization`, `expo-clipboard`, `expo-contacts`.

**Spec:** `docs/superpowers/specs/2026-09-23-friend-channels-design.md`

## Global Constraints

- Links are derived from `type` + `handle` on the server only; clients never build chat URLs. `deep_link` is set **only** for `OTHER`.
- Channel types: `WHATSAPP, TELEGRAM, SIGNAL, IMESSAGE, SMS, PHONE, EMAIL, INSTAGRAM, MESSENGER, OTHER`.
- Handles: E.164 `^\+[1-9]\d{6,14}$` for WHATSAPP/SIGNAL/SMS/PHONE; E.164 or email for IMESSAGE; Telegram `^[A-Za-z0-9_]{5,32}$`; Instagram `^[A-Za-z0-9._]{1,30}$`; Messenger `^[A-Za-z0-9.]{5,50}$`; OTHER label ≤ 100 chars. Usernames stored without leading `@`.
- OTHER `deepLink` must use `https:`, `tel:`, `sms:` or `mailto:`.
- Opening a channel: `Linking.openURL` first; record contact only after it resolves. No revision on `open`. No Undo.
- Unknown body fields → 400; duplicate `(friend, type, handle)` → 409; other user's / mismatched resources → 404.
- Every mutation locks the friend before the nudge (existing lock order).
- Client tests: `await render(...)` / `await renderHook(...)`; use `toBeDisabled`/`toBeChecked`, not `toHaveAccessibilityState` (RNTL 14).
- Every new client component gets a `.stories.tsx`, a `.test.tsx` with `describeStories` and a default-story snapshot, following `note-modal`.
- Client code must follow Expo SDK 57 docs (`client/AGENTS.md`): https://docs.expo.dev/versions/v57.0.0/
- There is no toast component in the app: "toasts" from the spec are inline caption messages on the friend screen, like the existing `contactError`.
- "Test" (open without recording) is only available in edit mode, because only saved channels have a server-built `link`.

---

## File Structure

**Server**

- Create `server/src/friends/channel-rules.ts` — handle/deepLink validation, body parsing, `channelLink`. Pure; unit-tested.
- Create `server/src/friends/channel-rules.spec.ts`
- Modify `server/src/friends/entities/channel-type.enum.ts` — add INSTAGRAM, MESSENGER.
- Modify `server/src/friends/entities/channel.entity.ts` — `handle`, nullable `deepLink`, computed `link`, constraints.
- Create `server/src/database/migrations/1789600000000-ChannelHandle.ts`; register in `migrations/index.ts`.
- Modify `server/src/nudges/nudge-scheduling.service.ts` — `recordContact`.
- Modify `server/src/nudges/nudges.service.ts` — confirm uses `recordContact`.
- Create `server/src/friends/channels.service.ts`, `server/src/friends/channels.controller.ts`; register in `friends.module.ts`.
- Create `server/test/channels-api.e2e-spec.ts`; modify `server/test/database.e2e-spec.ts`.
- Create `bruno/Channels/*.bru`; modify `docs/backend-api.md`.

**Client**

- Modify `client/src/api/types.ts`; create `client/src/api/channels.ts`, `client/src/api/use-channel-mutations.ts` (+ test).
- Create `client/src/lib/channels.ts` (platform metadata, display), `client/src/lib/channel-input.ts` (paste/typing parser) (+ tests).
- Create `client/src/lib/device-input.ts` — thin wrappers over `expo-clipboard` / `expo-contacts` so components can be tested with `jest.mock`.
- Create `client/src/components/friend/channel-list.tsx` (+ stories, test).
- Create `client/src/components/friend/channel-modal.tsx` (+ stories, test).
- Modify `client/src/screens/friend-detail-screen.tsx` (+ test).
- Modify `client/app.json` (contacts plugin); add `channels: []` to every `Friend` fixture.

---

### Task 1: Server channel rules (validation + link building)

**Files:**

- Modify: `server/src/friends/entities/channel-type.enum.ts`
- Create: `server/src/friends/channel-rules.ts`
- Test: `server/src/friends/channel-rules.spec.ts`

**Interfaces:**

- Produces:
  - `channelHandle(type: ChannelType, value: unknown): string` (throws `BadRequestException`)
  - `channelDeepLink(type: ChannelType, value: unknown): string | null`
  - `channelLink(type: ChannelType, handle: string, deepLink: string | null): string`
  - `interface CreateChannelInput { type: ChannelType; handle: string; deepLink: string | null }`
  - `createChannelInput(value: unknown): CreateChannelInput`
  - `interface UpdateChannelInput { handle?: unknown; deepLink?: unknown }` (raw; validated against the stored type by the service)
  - `updateChannelInput(value: unknown): UpdateChannelInput`

- [ ] **Step 1: Add the enum values**

`server/src/friends/entities/channel-type.enum.ts`:

```ts
export enum ChannelType {
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  SIGNAL = 'SIGNAL',
  IMESSAGE = 'IMESSAGE',
  SMS = 'SMS',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  INSTAGRAM = 'INSTAGRAM',
  MESSENGER = 'MESSENGER',
  OTHER = 'OTHER',
}
```

- [ ] **Step 2: Write the failing tests**

`server/src/friends/channel-rules.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import {
  channelDeepLink,
  channelHandle,
  channelLink,
  createChannelInput,
  updateChannelInput,
} from './channel-rules.js';
import { ChannelType } from './entities/channel-type.enum.js';

describe('channelLink', () => {
  it.each([
    [ChannelType.WHATSAPP, '+420777123456', 'https://wa.me/420777123456'],
    [ChannelType.SIGNAL, '+420777123456', 'https://signal.me/#p/+420777123456'],
    [ChannelType.SMS, '+420777123456', 'sms:+420777123456'],
    [ChannelType.PHONE, '+420777123456', 'tel:+420777123456'],
    [ChannelType.IMESSAGE, '+420777123456', 'sms:+420777123456'],
    [ChannelType.IMESSAGE, 'jan@example.com', 'sms:jan@example.com'],
    [ChannelType.TELEGRAM, 'jan_novak', 'https://t.me/jan_novak'],
    [ChannelType.INSTAGRAM, 'jan.novak', 'https://ig.me/m/jan.novak'],
    [ChannelType.MESSENGER, 'jan.novak', 'https://m.me/jan.novak'],
    [ChannelType.EMAIL, 'jan@example.com', 'mailto:jan@example.com'],
  ])('%s %s -> %s', (type, handle, link) => {
    expect(channelLink(type, handle, null)).toBe(link);
  });

  it('uses the stored link for OTHER', () => {
    expect(channelLink(ChannelType.OTHER, 'Discord', 'https://discord.com/users/1')).toBe(
      'https://discord.com/users/1',
    );
  });
});

describe('channelHandle', () => {
  it('trims and strips a leading @ from usernames', () => {
    expect(channelHandle(ChannelType.INSTAGRAM, ' @jan.novak ')).toBe('jan.novak');
  });

  it('accepts E.164 phones for phone types', () => {
    expect(channelHandle(ChannelType.WHATSAPP, '+420777123456')).toBe('+420777123456');
  });

  it('accepts a phone or an email for iMessage', () => {
    expect(channelHandle(ChannelType.IMESSAGE, 'jan@example.com')).toBe('jan@example.com');
    expect(channelHandle(ChannelType.IMESSAGE, '+420777123456')).toBe('+420777123456');
  });

  it.each([
    [ChannelType.WHATSAPP, '777 123 456'],
    [ChannelType.SIGNAL, '420777123456'],
    [ChannelType.TELEGRAM, 'abc'],
    [ChannelType.INSTAGRAM, 'jan novak'],
    [ChannelType.MESSENGER, 'jan'],
    [ChannelType.EMAIL, 'not-an-email'],
    [ChannelType.OTHER, ''],
    [ChannelType.OTHER, 'x'.repeat(101)],
    [ChannelType.INSTAGRAM, 42],
  ])('rejects %s %j', (type, value) => {
    expect(() => channelHandle(type, value)).toThrow(BadRequestException);
  });
});

describe('channelDeepLink', () => {
  it('is null for derived types and rejects a supplied link', () => {
    expect(channelDeepLink(ChannelType.WHATSAPP, undefined)).toBeNull();
    expect(channelDeepLink(ChannelType.WHATSAPP, null)).toBeNull();
    expect(() => channelDeepLink(ChannelType.WHATSAPP, 'https://wa.me/1')).toThrow(
      BadRequestException,
    );
  });

  it('requires an allowed scheme for OTHER', () => {
    expect(channelDeepLink(ChannelType.OTHER, ' https://discord.com/users/1 ')).toBe(
      'https://discord.com/users/1',
    );
    expect(channelDeepLink(ChannelType.OTHER, 'tel:+420777123456')).toBe('tel:+420777123456');
    expect(() => channelDeepLink(ChannelType.OTHER, undefined)).toThrow(BadRequestException);
    expect(() => channelDeepLink(ChannelType.OTHER, 'javascript:alert(1)')).toThrow(
      BadRequestException,
    );
    expect(() => channelDeepLink(ChannelType.OTHER, 'not a url')).toThrow(BadRequestException);
  });
});

describe('createChannelInput / updateChannelInput', () => {
  it('parses a create body', () => {
    expect(createChannelInput({ type: 'INSTAGRAM', handle: '@jan.novak' })).toEqual({
      type: ChannelType.INSTAGRAM,
      handle: 'jan.novak',
      deepLink: null,
    });
  });

  it('rejects unknown fields, bad types and missing handles', () => {
    expect(() =>
      createChannelInput({ type: 'WHATSAPP', handle: '+420777123456', friendId: 'x' }),
    ).toThrow(BadRequestException);
    expect(() => createChannelInput({ type: 'FAX', handle: '+420777123456' })).toThrow(
      BadRequestException,
    );
    expect(() => createChannelInput({ type: 'WHATSAPP' })).toThrow(BadRequestException);
  });

  it('requires a nonempty update body with known fields only', () => {
    expect(updateChannelInput({ handle: 'x' })).toEqual({ handle: 'x' });
    expect(() => updateChannelInput({})).toThrow(BadRequestException);
    expect(() => updateChannelInput({ type: 'SMS' })).toThrow(BadRequestException);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @nudge/server test -- channel-rules`
Expected: FAIL — `Cannot find module './channel-rules.js'`.

- [ ] **Step 4: Implement**

`server/src/friends/channel-rules.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { enumInput, objectInput } from '../common/input.js';
import { ChannelType } from './entities/channel-type.enum.js';

const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAMES: Partial<Record<ChannelType, RegExp>> = {
  [ChannelType.TELEGRAM]: /^[A-Za-z0-9_]{5,32}$/,
  [ChannelType.INSTAGRAM]: /^[A-Za-z0-9._]{1,30}$/,
  [ChannelType.MESSENGER]: /^[A-Za-z0-9.]{5,50}$/,
};
const PHONE_TYPES: readonly ChannelType[] = [
  ChannelType.WHATSAPP,
  ChannelType.SIGNAL,
  ChannelType.SMS,
  ChannelType.PHONE,
];
const OTHER_LINK_SCHEMES = ['https:', 'tel:', 'sms:', 'mailto:'];

/** Normalizes a handle and checks it fits its channel type (phone, username or email). */
export function channelHandle(type: ChannelType, value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const valid = (() => {
    if (PHONE_TYPES.includes(type)) return E164.test(raw);
    if (type === ChannelType.IMESSAGE) return E164.test(raw) || EMAIL.test(raw);
    if (type === ChannelType.EMAIL) return raw.length <= 254 && EMAIL.test(raw);
    if (type === ChannelType.OTHER) return raw.length > 0 && raw.length <= 100;
    return USERNAMES[type]?.test(raw.replace(/^@/, '')) ?? false;
  })();
  if (!valid) throw new BadRequestException(`Invalid handle for ${type}`);
  return USERNAMES[type] ? raw.replace(/^@/, '') : raw;
}

/** Only OTHER stores a link (with an allowed scheme); every other type derives it. */
export function channelDeepLink(type: ChannelType, value: unknown): string | null {
  if (type !== ChannelType.OTHER) {
    if (value !== undefined && value !== null) {
      throw new BadRequestException('deepLink is only allowed for OTHER');
    }
    return null;
  }
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) {
    throw new BadRequestException('deepLink is required for OTHER');
  }
  const link = value.trim();
  let protocol: string;
  try {
    protocol = new URL(link).protocol;
  } catch {
    throw new BadRequestException('deepLink must be a URL');
  }
  if (!OTHER_LINK_SCHEMES.includes(protocol)) {
    throw new BadRequestException('deepLink must use https, tel, sms or mailto');
  }
  return link;
}

/** The URL that opens the conversation. Derived, so stored rows survive link-format changes. */
export function channelLink(type: ChannelType, handle: string, deepLink: string | null): string {
  switch (type) {
    case ChannelType.WHATSAPP:
      return `https://wa.me/${handle.slice(1)}`;
    case ChannelType.SIGNAL:
      return `https://signal.me/#p/${handle}`;
    case ChannelType.SMS:
    case ChannelType.IMESSAGE:
      return `sms:${handle}`;
    case ChannelType.PHONE:
      return `tel:${handle}`;
    case ChannelType.TELEGRAM:
      return `https://t.me/${handle}`;
    case ChannelType.INSTAGRAM:
      return `https://ig.me/m/${handle}`;
    case ChannelType.MESSENGER:
      return `https://m.me/${handle}`;
    case ChannelType.EMAIL:
      return `mailto:${handle}`;
    case ChannelType.OTHER:
      return deepLink ?? '';
  }
}

export interface CreateChannelInput {
  type: ChannelType;
  handle: string;
  deepLink: string | null;
}

/** Raw PATCH fields; the service validates them against the channel's stored type. */
export interface UpdateChannelInput {
  handle?: unknown;
  deepLink?: unknown;
}

export function createChannelInput(value: unknown): CreateChannelInput {
  const body = objectInput(value, ['type', 'handle', 'deepLink']);
  const type = enumInput(body.type, Object.values(ChannelType), 'type');
  return {
    type,
    handle: channelHandle(type, body.handle),
    deepLink: channelDeepLink(type, body.deepLink),
  };
}

export function updateChannelInput(value: unknown): UpdateChannelInput {
  const body = objectInput(value, ['handle', 'deepLink']);
  if (!Object.keys(body).length) throw new BadRequestException('At least one field is required');
  return body;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @nudge/server test -- channel-rules && pnpm --filter @nudge/server typecheck`
Expected: PASS; typecheck clean (the `switch` is exhaustive, so no implicit `undefined` return).

- [ ] **Step 6: Commit**

```bash
git add server/src/friends/channel-rules.ts server/src/friends/channel-rules.spec.ts server/src/friends/entities/channel-type.enum.ts
git commit -m "feat(server): channel handle validation and derived links"
```

---

### Task 2: Channel schema — migration and entity

**Files:**

- Create: `server/src/database/migrations/1789600000000-ChannelHandle.ts`
- Modify: `server/src/database/migrations/index.ts`
- Modify: `server/src/friends/entities/channel.entity.ts`
- Test: `server/test/database.e2e-spec.ts` (lines 48-76 and 107-122)

**Interfaces:**

- Consumes: `channelLink` from Task 1.
- Produces: `Channel` entity with `handle: string`, `deepLink: string | null`, non-column `link: string` computed after load/insert/update; DB constraints `channels_friend_id_type_handle_key` (unique) and `channels_deep_link_check`.

- [ ] **Step 1: Update the existing database e2e tests (they become the failing tests)**

In `server/test/database.e2e-spec.ts`, replace the channel insert and assertion in `'loads a friend with its channels, catch-ups and nudge'`:

```ts
await dataSource
  .getRepository(Channel)
  .save({ friendId: friend.id, type: ChannelType.WHATSAPP, handle: '+420777123456' });
```

```ts
expect(loaded.channels).toEqual([
  expect.objectContaining({
    type: ChannelType.WHATSAPP,
    handle: '+420777123456',
    deepLink: null,
    link: 'https://wa.me/420777123456',
  }),
]);
```

In `'cascades a user delete to friends, channels, catch-ups and nudges'` replace the channel insert:

```ts
await dataSource
  .getRepository(Channel)
  .save({ friendId: friend.id, type: ChannelType.SMS, handle: '+420777123456' });
```

Add a new test after `'rejects values outside the enums'`:

```ts
it('enforces channel link and uniqueness constraints', async () => {
  const user = await createUser();
  const friend = await createFriend(user);
  const channels = dataSource.getRepository(Channel);

  await expect(
    channels.insert({
      friendId: friend.id,
      type: ChannelType.WHATSAPP,
      handle: '+420777123456',
      deepLink: 'https://wa.me/1',
    }),
  ).rejects.toThrow(QueryFailedError);
  await expect(
    channels.insert({ friendId: friend.id, type: ChannelType.OTHER, handle: 'Discord' }),
  ).rejects.toThrow(QueryFailedError);

  await channels.insert({ friendId: friend.id, type: ChannelType.INSTAGRAM, handle: 'jan' });
  await expect(
    channels.insert({ friendId: friend.id, type: ChannelType.INSTAGRAM, handle: 'jan' }),
  ).rejects.toThrow(QueryFailedError);
});
```

If `QueryFailedError` isn't imported in this file yet, add it to the `typeorm` import.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @nudge/server test:e2e -- database`
Expected: FAIL — `column "handle" of relation "channels" does not exist` (and the TS entity lacks `handle`).

- [ ] **Step 3: Write the migration**

`server/src/database/migrations/1789600000000-ChannelHandle.ts`:

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Channels store a handle and derive their link; only OTHER keeps a user-supplied deep_link.
 * Nothing writes channels before this migration. If rows exist, adding the NOT NULL handle
 * fails on purpose rather than inventing handles.
 */
export class ChannelHandle1789600000000 implements MigrationInterface {
  name = 'ChannelHandle1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."channels_type_enum" ADD VALUE 'INSTAGRAM'`);
    await queryRunner.query(`ALTER TYPE "public"."channels_type_enum" ADD VALUE 'MESSENGER'`);
    await queryRunner.query(`ALTER TABLE "channels" ADD "handle" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "channels" ALTER COLUMN "deep_link" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "channels_friend_id_type_handle_key" UNIQUE ("friend_id", "type", "handle")`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "channels_deep_link_check" CHECK (("type" = 'OTHER') = ("deep_link" IS NOT NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "channels" DROP CONSTRAINT "channels_deep_link_check"`);
    await queryRunner.query(
      `ALTER TABLE "channels" DROP CONSTRAINT "channels_friend_id_type_handle_key"`,
    );
    // Reverting: the old enum and NOT NULL deep_link cannot represent these rows.
    await queryRunner.query(`DELETE FROM "channels" WHERE "type" IN ('INSTAGRAM', 'MESSENGER')`);
    await queryRunner.query(`UPDATE "channels" SET "deep_link" = '' WHERE "deep_link" IS NULL`);
    await queryRunner.query(`ALTER TABLE "channels" ALTER COLUMN "deep_link" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "channels" DROP COLUMN "handle"`);
    await queryRunner.query(
      `ALTER TYPE "public"."channels_type_enum" RENAME TO "channels_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."channels_type_enum" AS ENUM('WHATSAPP', 'TELEGRAM', 'SIGNAL', 'IMESSAGE', 'SMS', 'PHONE', 'EMAIL', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ALTER COLUMN "type" TYPE "public"."channels_type_enum" USING "type"::text::"public"."channels_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."channels_type_enum_old"`);
  }
}
```

Register it in `server/src/database/migrations/index.ts`:

```ts
import { ChannelHandle1789600000000 } from './1789600000000-ChannelHandle.js';
// …
export const migrations: MixedList<new () => MigrationInterface> = [
  InitialSchema1789376400000,
  ReusableNudge1789380000000,
  UserName1789414404694,
  FriendProfile1789500000000,
  ChannelHandle1789600000000,
];
```

- [ ] **Step 4: Update the entity**

`server/src/friends/entities/channel.entity.ts`:

```ts
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { channelLink } from '../channel-rules.js';
import { ChannelType } from './channel-type.enum.js';
import { Friend } from './friend.entity.js';

@Entity({ name: 'channels' })
@Index('channels_friend_id_idx', ['friendId'])
@Unique('channels_friend_id_type_handle_key', ['friendId', 'type', 'handle'])
@Check('channels_deep_link_check', `("type" = 'OTHER') = ("deep_link" IS NOT NULL)`)
export class Channel {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'channels_pkey' })
  id: string;

  @Column({ type: 'uuid', name: 'friend_id' })
  friendId: string;

  @ManyToOne(() => Friend, (friend) => friend.channels, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'friend_id', foreignKeyConstraintName: 'channels_friend_id_fkey' })
  friend: Relation<Friend>;

  // Use TypeORM's default enum name: explicitly repeating it causes spurious schema diffs.
  @Column({ type: 'enum', enum: ChannelType })
  type: ChannelType;

  /** E.164 phone, username (no @), email, or for OTHER a free-text label. */
  @Column({ type: 'text' })
  handle: string;

  /** Only for OTHER: the user-supplied URL. Every other type derives its link from `handle`. */
  @Column({ type: 'text', name: 'deep_link', nullable: true })
  deepLink: string | null;

  /** Not a column: the URL that opens the conversation, recomputed whenever the row is read or written. */
  link: string;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  computeLink(): void {
    this.link = channelLink(this.type, this.handle, this.deepLink);
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @nudge/server test:e2e -- database && pnpm --filter @nudge/server typecheck`
Expected: PASS.

- [ ] **Step 6: Check the migration matches the entities**

Run: `pnpm docker:db && pnpm db:migrate && pnpm --filter @nudge/server migration:generate CheckDrift`
Expected: `No changes in database schema were found`. If a file is generated, inspect the diff, align the entity decorators (not the migration) until it's empty, and delete the generated file.

- [ ] **Step 7: Commit**

```bash
git add server/src/database/migrations server/src/friends/entities/channel.entity.ts server/test/database.e2e-spec.ts
git commit -m "feat(server): channel handle column, derived link and constraints"
```

---

### Task 3: Channels API and recording contact on open

**Files:**

- Modify: `server/src/nudges/nudge-scheduling.service.ts`
- Modify: `server/src/nudges/nudges.service.ts:41-46`
- Create: `server/src/friends/channels.service.ts`
- Create: `server/src/friends/channels.controller.ts`
- Modify: `server/src/friends/friends.module.ts`
- Test: `server/test/channels-api.e2e-spec.ts`
- Create: `bruno/Channels/folder.bru`, `bruno/Channels/Create Channel.bru`, `bruno/Channels/Update Channel.bru`, `bruno/Channels/Delete Channel.bru`, `bruno/Channels/Open Channel.bru`
- Modify: `bruno/environments/Local.bru`, `docs/backend-api.md`

**Interfaces:**

- Consumes: `createChannelInput`, `updateChannelInput`, `channelHandle`, `channelDeepLink`, `CreateChannelInput`, `UpdateChannelInput` (Task 1); `Channel` entity (Task 2).
- Produces:
  - `NudgeSchedulingService.recordContact(manager: EntityManager, friend: Friend): Promise<Nudge>`
  - HTTP: `POST /v1/friends/:friendId/channels` → 201 `ChannelResponse`; `PATCH …/:channelId` → 200 `ChannelResponse`; `DELETE …/:channelId` → 204; `POST …/:channelId/open` → 200 `{ lastContactAt: string; nudge: Nudge }`.
  - `ChannelResponse = { id, friendId, type, handle, deepLink, link }`. `GET /v1/friends[/:id]` channels now include `link`.

- [ ] **Step 1: Write the failing e2e tests**

`server/test/channels-api.e2e-spec.ts`:

```ts
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { Friend } from '../src/friends/entities/friend.entity.js';
import { Nudge } from '../src/nudges/entities/nudge.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { createTestApp, truncateAll } from './create-test-app.js';

interface ChannelResponse {
  id: string;
  type: string;
  handle: string;
  deepLink: string | null;
  link: string;
}
interface FriendResponse {
  id: string;
  lastContactAt: string | null;
  nudge: { id: string; revision: number; scheduledFor: string };
  channels: ChannelResponse[];
}

describe('Channels API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userId: string | undefined;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp(() => userId));
  });
  beforeEach(async () => {
    await truncateAll(dataSource);
    userId = (await dataSource.getRepository(User).save({ timezone: 'Europe/Prague' })).id;
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function createFriend(): Promise<FriendResponse> {
    const response = await http()
      .post('/v1/friends')
      .send({ name: 'Alice', periodicity: 'MONTHLY' })
      .expect(201);
    return response.body as FriendResponse;
  }
  async function addChannel(friendId: string, body: object): Promise<ChannelResponse> {
    const response = await http().post(`/v1/friends/${friendId}/channels`).send(body).expect(201);
    return response.body as ChannelResponse;
  }

  it('creates a channel with a derived link and lists it on the friend', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'INSTAGRAM', handle: '@jan.novak' });
    expect(channel).toMatchObject({
      type: 'INSTAGRAM',
      handle: 'jan.novak',
      deepLink: null,
      link: 'https://ig.me/m/jan.novak',
    });
    const loaded = await http().get(`/v1/friends/${friend.id}`).expect(200);
    expect((loaded.body as FriendResponse).channels).toEqual([
      expect.objectContaining({ id: channel.id, link: 'https://ig.me/m/jan.novak' }),
    ]);
  });

  it('stores OTHER with its own link', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, {
      type: 'OTHER',
      handle: 'Discord',
      deepLink: 'https://discord.com/users/1',
    });
    expect(channel.link).toBe('https://discord.com/users/1');
  });

  it('validates bodies', async () => {
    const friend = await createFriend();
    const url = `/v1/friends/${friend.id}/channels`;
    await http().post(url).send({ type: 'WHATSAPP', handle: '777 123 456' }).expect(400);
    await http()
      .post(url)
      .send({ type: 'WHATSAPP', handle: '+420777123456', deepLink: 'https://wa.me/1' })
      .expect(400);
    await http().post(url).send({ type: 'OTHER', handle: 'Discord' }).expect(400);
    await http()
      .post(url)
      .send({ type: 'SMS', handle: '+420777123456', friendId: friend.id })
      .expect(400);
  });

  it('rejects a duplicate channel with 409', async () => {
    const friend = await createFriend();
    await addChannel(friend.id, { type: 'WHATSAPP', handle: '+420777123456' });
    await http()
      .post(`/v1/friends/${friend.id}/channels`)
      .send({ type: 'WHATSAPP', handle: '+420777123456' })
      .expect(409);
  });

  it('updates the handle (validated against the stored type) and deletes', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'TELEGRAM', handle: 'jan_novak' });
    const url = `/v1/friends/${friend.id}/channels/${channel.id}`;
    const updated = await http().patch(url).send({ handle: 'jan_novak2' }).expect(200);
    expect(updated.body).toMatchObject({ handle: 'jan_novak2', link: 'https://t.me/jan_novak2' });
    await http().patch(url).send({ handle: '+420777123456' }).expect(400);
    await http().patch(url).send({ type: 'SMS' }).expect(400);
    await http().patch(url).send({}).expect(400);
    await http().delete(url).expect(204);
    await http().delete(url).expect(404);
  });

  it('opening a channel records contact now and replans the nudge', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'WHATSAPP', handle: '+420777123456' });
    const before = Date.now();
    const response = await http()
      .post(`/v1/friends/${friend.id}/channels/${channel.id}/open`)
      .expect(200);
    const body = response.body as { lastContactAt: string; nudge: FriendResponse['nudge'] };
    expect(new Date(body.lastContactAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(body.nudge.id).toBe(friend.nudge.id);
    // Created and opened moments apart, so the replanned date can equal the original one;
    // the revision bump proves the replan happened.
    expect(body.nudge.revision).toBe(friend.nudge.revision + 1);
    const loaded = (await http().get(`/v1/friends/${friend.id}`).expect(200))
      .body as FriendResponse;
    expect(loaded.lastContactAt).toBe(body.lastContactAt);
  });

  it('opening works for a friend whose nudge row is missing', async () => {
    const friend = await createFriend();
    const channel = await addChannel(friend.id, { type: 'SMS', handle: '+420777123456' });
    await dataSource.getRepository(Nudge).delete({ friendId: friend.id });
    await http().post(`/v1/friends/${friend.id}/channels/${channel.id}/open`).expect(200);
    expect(await dataSource.getRepository(Nudge).countBy({ friendId: friend.id })).toBe(1);
  });

  it('hides other users and mismatched friend/channel pairs behind 404', async () => {
    const friend = await createFriend();
    const other = await createFriend();
    const channel = await addChannel(friend.id, { type: 'SMS', handle: '+420777123456' });
    await http().post(`/v1/friends/${other.id}/channels/${channel.id}/open`).expect(404);
    await http()
      .patch(`/v1/friends/${other.id}/channels/${channel.id}`)
      .send({ handle: '+420777000000' })
      .expect(404);

    userId = (await dataSource.getRepository(User).save({ timezone: 'Europe/Prague' })).id;
    await http().post(`/v1/friends/${friend.id}/channels/${channel.id}/open`).expect(404);
    await http()
      .post(`/v1/friends/${friend.id}/channels`)
      .send({ type: 'SMS', handle: '+420777000000' })
      .expect(404);
    expect(
      (await dataSource.getRepository(Friend).findOneByOrFail({ id: friend.id })).lastContactAt,
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @nudge/server test:e2e -- channels-api`
Expected: FAIL — `POST /v1/friends/:id/channels` returns 404 (route missing).

- [ ] **Step 3: Add `recordContact` and use it from confirm**

`server/src/nudges/nudge-scheduling.service.ts` — change the `Friend` import to a value import and add the method:

```ts
import { Friend } from '../friends/entities/friend.entity.js';
```

```ts
  /** Contact happened now: store it and plan the next reminder from it. Caller holds the friend lock. */
  async recordContact(manager: EntityManager, friend: Friend): Promise<Nudge> {
    friend.lastContactAt = new Date();
    await manager.save(Friend, friend);
    return this.plan(manager, friend);
  }
```

`server/src/nudges/nudges.service.ts` — replace the confirm branch:

```ts
if (action === 'confirm') {
  // Contact is recorded here or by opening a channel; catch-ups never affect it.
  return this.scheduling.recordContact(manager, friend);
}
```

Remove the now-unused `Friend` import from `nudges.service.ts` if typecheck flags it.

- [ ] **Step 4: Implement the service**

`server/src/friends/channels.service.ts`:

```ts
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import type { Nudge } from '../nudges/entities/nudge.entity.js';
import { NudgeSchedulingService } from '../nudges/nudge-scheduling.service.js';
import {
  channelDeepLink,
  channelHandle,
  type CreateChannelInput,
  type UpdateChannelInput,
} from './channel-rules.js';
import { Channel } from './entities/channel.entity.js';
import { ownedFriend } from './friend-access.js';

const UNIQUE_VIOLATION = '23505';

/** Ways to reach a friend. Opening one records contact, like confirming the nudge. */
@Injectable()
export class ChannelsService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(NudgeSchedulingService) private readonly scheduling: NudgeSchedulingService,
  ) {}

  async create(userId: string, friendId: string, input: CreateChannelInput): Promise<Channel> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    return this.save(this.dataSource.manager.create(Channel, { ...input, friendId }));
  }

  async update(
    userId: string,
    friendId: string,
    channelId: string,
    input: UpdateChannelInput,
  ): Promise<Channel> {
    const channel = await this.get(userId, friendId, channelId);
    if (input.handle !== undefined) channel.handle = channelHandle(channel.type, input.handle);
    if (input.deepLink !== undefined) {
      channel.deepLink = channelDeepLink(channel.type, input.deepLink);
    }
    return this.save(channel);
  }

  async delete(userId: string, friendId: string, channelId: string): Promise<void> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    const result = await this.dataSource.getRepository(Channel).delete({ id: channelId, friendId });
    if (!result.affected) throw new NotFoundException('Channel not found');
  }

  /** No revision: opening a chat is a fact about now, so a stale client must not drop it. */
  async open(
    userId: string,
    friendId: string,
    channelId: string,
  ): Promise<{ lastContactAt: Date; nudge: Nudge }> {
    return this.dataSource.transaction(async (manager) => {
      const friend = await ownedFriend(manager, userId, friendId, true);
      if (!(await manager.existsBy(Channel, { id: channelId, friendId }))) {
        throw new NotFoundException('Channel not found');
      }
      const nudge = await this.scheduling.recordContact(manager, friend);
      return { lastContactAt: friend.lastContactAt!, nudge };
    });
  }

  private async get(userId: string, friendId: string, channelId: string): Promise<Channel> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    const channel = await this.dataSource
      .getRepository(Channel)
      .findOneBy({ id: channelId, friendId });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  private async save(channel: Channel): Promise<Channel> {
    try {
      return await this.dataSource.getRepository(Channel).save(channel);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('This friend already has that channel');
      }
      throw error;
    }
  }
}
```

- [ ] **Step 5: Implement the controller and register both**

`server/src/friends/channels.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserGuard, CurrentUserId } from '../common/current-user.js';
import { createChannelInput, updateChannelInput } from './channel-rules.js';
import { ChannelsService } from './channels.service.js';

@Controller('v1/friends/:friendId/channels')
@UseGuards(CurrentUserGuard)
export class ChannelsController {
  constructor(@Inject(ChannelsService) private readonly channels: ChannelsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Body() body: unknown,
  ) {
    return this.channels.create(userId, friendId, createChannelInput(body));
  }

  @Patch(':channelId')
  update(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() body: unknown,
  ) {
    return this.channels.update(userId, friendId, channelId, updateChannelInput(body));
  }

  @Delete(':channelId')
  @HttpCode(204)
  delete(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.delete(userId, friendId, channelId);
  }

  @Post(':channelId/open')
  @HttpCode(200)
  open(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.open(userId, friendId, channelId);
  }
}
```

`server/src/friends/friends.module.ts` — add imports and register:

```ts
import { ChannelsController } from './channels.controller.js';
import { ChannelsService } from './channels.service.js';
// …
  controllers: [FriendsController, CatchUpsController, ChannelsController],
  providers: [FriendsService, CatchUpsService, ChannelsService],
```

- [ ] **Step 6: Run all server tests**

Run: `pnpm --filter @nudge/server test && pnpm --filter @nudge/server test:e2e && pnpm --filter @nudge/server typecheck`
Expected: all PASS, including the existing confirm tests in `friends-api.e2e-spec.ts` (proves the `recordContact` extraction kept behaviour).

- [ ] **Step 7: Bruno requests**

`bruno/Channels/folder.bru`:

```
meta {
  name: Channels
  seq: 5
}
```

`bruno/Channels/Create Channel.bru`:

```
meta {
  name: Create Channel
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/v1/friends/{{friendId}}/channels
  body: json
}

body:json {
  {
    "type": "WHATSAPP",
    "handle": "+420777123456"
  }
}

script:post-response {
  if (res.status === 201) {
    bru.setEnvVar("channelId", res.body.id);
  }
}

docs {
  type is one of WHATSAPP, TELEGRAM, SIGNAL, IMESSAGE, SMS, PHONE, EMAIL, INSTAGRAM,
  MESSENGER, OTHER. handle is an E.164 phone, a username (leading @ stripped) or an email,
  depending on type. deepLink is required for OTHER and rejected otherwise. The response
  carries the derived link.
}
```

`bruno/Channels/Update Channel.bru`:

```
meta {
  name: Update Channel
  type: http
  seq: 2
}

patch {
  url: {{baseUrl}}/v1/friends/{{friendId}}/channels/{{channelId}}
  body: json
}

body:json {
  {
    "handle": "+420777000111"
  }
}

docs {
  Nonempty subset of handle and deepLink, validated against the stored type. type is
  immutable: delete and re-add to change platform.
}
```

`bruno/Channels/Delete Channel.bru`:

```
meta {
  name: Delete Channel
  type: http
  seq: 3
}

delete {
  url: {{baseUrl}}/v1/friends/{{friendId}}/channels/{{channelId}}
  body: none
}
```

`bruno/Channels/Open Channel.bru`:

```
meta {
  name: Open Channel
  type: http
  seq: 4
}

post {
  url: {{baseUrl}}/v1/friends/{{friendId}}/channels/{{channelId}}/open
  body: none
}

script:post-response {
  if (res.status === 200) {
    bru.setEnvVar("revision", res.body.nudge.revision);
  }
}

docs {
  Call after the app opened the channel's link. Records contact now and replans the
  nudge, like Confirm Nudge but without a revision. Returns { lastContactAt, nudge }.
}
```

Add `channelId: 00000000-0000-0000-0000-000000000000` to the `vars` block in `bruno/environments/Local.bru` (after `catchUpId`).

- [ ] **Step 8: API docs**

In `docs/backend-api.md`:

- Change the intro sentence "…independent of contact history, which is recorded only by nudge confirmation." to "…independent of contact history, which is recorded by nudge confirmation or by opening a channel."
- Add to the routes table, after the catch-up rows:

```
| POST   | `/v1/friends/:friendId/channels`                   | Add a way to reach the friend; returns it with its derived `link`  |
| PATCH  | `/v1/friends/:friendId/channels/:channelId`        | Edit `handle` or (OTHER only) `deepLink`                           |
| DELETE | `/v1/friends/:friendId/channels/:channelId`        | Delete the channel                                                 |
| POST   | `/v1/friends/:friendId/channels/:channelId/open`   | Record contact now and replan; no revision                         |
```

- Add a section before "## Authentication boundary":

````md
## Channels

A channel is a way to reach a friend. The server stores `type` and `handle` and derives
`link`, the URL the app opens, so stored channels survive link-format changes:

| Type      | Handle                             | `link`                         |
| --------- | ---------------------------------- | ------------------------------ |
| WHATSAPP  | E.164 phone                        | `https://wa.me/<digits>`       |
| SIGNAL    | E.164 phone                        | `https://signal.me/#p/<phone>` |
| SMS       | E.164 phone                        | `sms:<phone>`                  |
| PHONE     | E.164 phone                        | `tel:<phone>`                  |
| IMESSAGE  | E.164 phone or email               | `sms:<handle>`                 |
| TELEGRAM  | Username (5–32, `A-Z a-z 0-9 _`)   | `https://t.me/<username>`      |
| INSTAGRAM | Username (1–30, `A-Z a-z 0-9 . _`) | `https://ig.me/m/<username>`   |
| MESSENGER | Username or numeric id (5–50)      | `https://m.me/<handle>`        |
| EMAIL     | Email                              | `mailto:<email>`               |
| OTHER     | Label (≤ 100 characters)           | `deepLink`                     |

```json
{ "type": "INSTAGRAM", "handle": "@jan.novak" }
```

A leading `@` is stripped. `deepLink` is required for OTHER (`https:`, `tel:`, `sms:` or
`mailto:`) and rejected for every other type. A friend cannot have the same
`(type, handle)` twice (409). `type` cannot be changed.

`open` is called by the app after it opened the link. It records contact exactly like
nudge confirmation (sets `lastContactAt` to now and replans from it, creating the nudge if
it is missing) and returns `{ "lastContactAt": "…", "nudge": { … } }`. It takes no revision:
opening a chat is a fact about now, not an action on one reminder occurrence.
````

- [ ] **Step 9: Commit**

```bash
git add server bruno docs/backend-api.md
git commit -m "feat(server): channels API; opening a channel records contact"
```

---

### Task 4: Client API types, requests and mutation hooks

**Files:**

- Modify: `client/src/api/types.ts`
- Create: `client/src/api/channels.ts`
- Create: `client/src/api/use-channel-mutations.ts`
- Test: `client/src/api/use-channel-mutations.test.tsx`
- Modify (fixtures): every file from `grep -rln "nudgeEnabled:" client/src` that builds a `Friend` object — add `channels: []`.

**Interfaces:**

- Produces:
  - Types `ChannelType`, `Channel`, `CreateChannelBody`, `UpdateChannelBody`, `OpenChannelResult`; `Friend.channels: Channel[]`.
  - `createChannel(friendId, body)`, `updateChannel(friendId, channelId, body)`, `deleteChannel(friendId, channelId)`, `openChannel(friendId, channelId)` in `@/api/channels`.
  - Hooks `useCreateChannel(friendId)`, `useUpdateChannel(friendId)` (variables `{ channelId, body }`), `useDeleteChannel(friendId)` (variables `channelId`), `useOpenChannel(friendId)` (variables `channelId`). All invalidate `['friends']` on success.

- [ ] **Step 1: Add the types**

Append to `client/src/api/types.ts` (before `Friend`) and add the field to `Friend`:

```ts
export type ChannelType =
  | 'WHATSAPP'
  | 'TELEGRAM'
  | 'SIGNAL'
  | 'IMESSAGE'
  | 'SMS'
  | 'PHONE'
  | 'EMAIL'
  | 'INSTAGRAM'
  | 'MESSENGER'
  | 'OTHER';

/** A way to reach a friend. `link` is built by the server; the app only opens it. */
export type Channel = {
  id: string;
  type: ChannelType;
  /** E.164 phone, username (no @), email, or for OTHER a label. */
  handle: string;
  /** Only for OTHER. */
  deepLink: string | null;
  link: string;
};

/** POST /v1/friends/:id/channels body; deepLink only (and required) for OTHER. */
export type CreateChannelBody = { type: ChannelType; handle: string; deepLink?: string };

/** PATCH body; the type cannot change. */
export type UpdateChannelBody = Partial<{ handle: string; deepLink: string }>;

/** POST …/channels/:id/open response. */
export type OpenChannelResult = { lastContactAt: string; nudge: Nudge };
```

In `Friend`, after `nudge: Nudge | null;`:

```ts
  channels: Channel[];
```

- [ ] **Step 2: Fix fixtures**

Run: `pnpm --filter @nudge/client typecheck`
Expected: errors of the form `Property 'channels' is missing in type …` in test/story fixtures. Add `channels: []` next to `nudge` in each reported fixture, then rerun until clean.

- [ ] **Step 3: Request functions**

`client/src/api/channels.ts`:

```ts
import { apiFetch } from '@/api/http';
import type { Channel, CreateChannelBody, OpenChannelResult, UpdateChannelBody } from '@/api/types';

export function createChannel(friendId: string, body: CreateChannelBody): Promise<Channel> {
  return apiFetch<Channel>(`/v1/friends/${friendId}/channels`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateChannel(
  friendId: string,
  channelId: string,
  body: UpdateChannelBody,
): Promise<Channel> {
  return apiFetch<Channel>(`/v1/friends/${friendId}/channels/${channelId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteChannel(friendId: string, channelId: string): Promise<void> {
  return apiFetch<void>(`/v1/friends/${friendId}/channels/${channelId}`, { method: 'DELETE' });
}

/** Call after the link opened: records contact now and replans the nudge. */
export function openChannel(friendId: string, channelId: string): Promise<OpenChannelResult> {
  return apiFetch<OpenChannelResult>(`/v1/friends/${friendId}/channels/${channelId}/open`, {
    method: 'POST',
  });
}
```

- [ ] **Step 4: Write the failing hook tests**

`client/src/api/use-channel-mutations.test.tsx`:

```tsx
/// <reference types="jest" />

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as channelsApi from '@/api/channels';
import type { Channel } from '@/api/types';
import {
  useCreateChannel,
  useDeleteChannel,
  useOpenChannel,
  useUpdateChannel,
} from '@/api/use-channel-mutations';

jest.mock('@/api/channels');

const CHANNEL: Channel = {
  id: 'channel-1',
  type: 'WHATSAPP',
  handle: '+420777123456',
  deepLink: null,
  link: 'https://wa.me/420777123456',
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });
  const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateSpy };
}

beforeEach(() => {
  jest.mocked(channelsApi.createChannel).mockResolvedValue(CHANNEL);
  jest.mocked(channelsApi.updateChannel).mockResolvedValue(CHANNEL);
  jest.mocked(channelsApi.deleteChannel).mockResolvedValue(undefined);
  jest.mocked(channelsApi.openChannel).mockResolvedValue({
    lastContactAt: '2026-09-23T10:00:00Z',
    nudge: {
      id: 'nudge-1',
      scheduledFor: '2026-10-23T16:00:00Z',
      status: 'PLANNED',
      revision: 3,
      lastEditedAt: '2026-09-23T10:00:00Z',
    },
  });
});

it('creates a channel and refreshes friends', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useCreateChannel('friend-1'), { wrapper });
  result.current.mutate({ type: 'WHATSAPP', handle: '+420777123456' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.createChannel).toHaveBeenCalledWith('friend-1', {
    type: 'WHATSAPP',
    handle: '+420777123456',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});

it('updates a channel', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useUpdateChannel('friend-1'), { wrapper });
  result.current.mutate({ channelId: 'channel-1', body: { handle: '+420777000111' } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.updateChannel).toHaveBeenCalledWith('friend-1', 'channel-1', {
    handle: '+420777000111',
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});

it('deletes a channel', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useDeleteChannel('friend-1'), { wrapper });
  result.current.mutate('channel-1');
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.deleteChannel).toHaveBeenCalledWith('friend-1', 'channel-1');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});

it('records an opened channel', async () => {
  const { wrapper, invalidateSpy } = setup();
  const { result } = await renderHook(() => useOpenChannel('friend-1'), { wrapper });
  result.current.mutate('channel-1');
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(channelsApi.openChannel).toHaveBeenCalledWith('friend-1', 'channel-1');
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm --filter @nudge/client test -- use-channel-mutations`
Expected: FAIL — `Cannot find module '@/api/use-channel-mutations'`.

- [ ] **Step 6: Implement the hooks**

`client/src/api/use-channel-mutations.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createChannel, deleteChannel, openChannel, updateChannel } from '@/api/channels';
import type { CreateChannelBody, UpdateChannelBody } from '@/api/types';

/** Channels live on the friend, so every change refreshes the ['friends'] queries. */
function useFriendsInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['friends'] });
}

export function useCreateChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: (body: CreateChannelBody) => createChannel(friendId, body),
    onSuccess,
  });
}

export function useUpdateChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: ({ channelId, body }: { channelId: string; body: UpdateChannelBody }) =>
      updateChannel(friendId, channelId, body),
    onSuccess,
  });
}

export function useDeleteChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: (channelId: string) => deleteChannel(friendId, channelId),
    onSuccess,
  });
}

/** Records contact after the chat opened; the refetch updates last contact and the nudge. */
export function useOpenChannel(friendId: string) {
  const onSuccess = useFriendsInvalidation();
  return useMutation({
    mutationFn: (channelId: string) => openChannel(friendId, channelId),
    onSuccess,
  });
}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm --filter @nudge/client test -- use-channel-mutations && pnpm --filter @nudge/client typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add client/src
git commit -m "feat(client): channel types, requests and mutation hooks"
```

---

### Task 5: Client channel metadata and input parsing

**Files:**

- Create: `client/src/lib/channels.ts`
- Create: `client/src/lib/channel-input.ts`
- Test: `client/src/lib/channel-input.test.ts`, `client/src/lib/channels.test.ts`
- Modify: `client/package.json` (via `expo install`)

**Interfaces:**

- Consumes: `ChannelType`, `Channel` from `@/api/types`.
- Produces:
  - `type ChannelInputKind = 'phone' | 'username' | 'email' | 'phoneOrEmail' | 'other'`
  - `CHANNEL_PLATFORMS: Record<ChannelType, { label: string; input: ChannelInputKind; howTo?: string; appUrl?: string }>`
  - `CHANNEL_TYPES: ChannelType[]` (display order)
  - `formatHandle(type: ChannelType, handle: string): string`
  - `type ParsedChannel = { type: ChannelType; handle: string }`
  - `parseChannelInput(text: string, hint?: ChannelType, defaultCountry?: CountryCode): ParsedChannel | null`
  - `deviceCountry(): CountryCode | undefined`

- [ ] **Step 1: Install dependencies**

Run: `cd client && npx expo install libphonenumber-js expo-localization && cd ..`
Expected: both added to `client/package.json` `dependencies` at SDK-57-compatible versions.

- [ ] **Step 2: Write the failing tests**

`client/src/lib/channel-input.test.ts`:

```ts
import { parseChannelInput } from '@/lib/channel-input';

describe('parseChannelInput', () => {
  it.each([
    ['https://www.instagram.com/jan.novak?igsh=abc123', { type: 'INSTAGRAM', handle: 'jan.novak' }],
    ['instagram.com/jan.novak/', { type: 'INSTAGRAM', handle: 'jan.novak' }],
    ['https://ig.me/m/jan.novak', { type: 'INSTAGRAM', handle: 'jan.novak' }],
    ['https://www.facebook.com/jan.novak.5', { type: 'MESSENGER', handle: 'jan.novak.5' }],
    [
      'https://www.facebook.com/profile.php?id=100012345678',
      { type: 'MESSENGER', handle: '100012345678' },
    ],
    ['https://m.me/jan.novak', { type: 'MESSENGER', handle: 'jan.novak' }],
    ['https://t.me/jan_novak', { type: 'TELEGRAM', handle: 'jan_novak' }],
    ['https://wa.me/420777123456', { type: 'WHATSAPP', handle: '+420777123456' }],
    ['https://signal.me/#p/+420777123456', { type: 'SIGNAL', handle: '+420777123456' }],
    ['jan@example.com', { type: 'EMAIL', handle: 'jan@example.com' }],
  ] as const)('parses %s without a hint', (text, expected) => {
    expect(parseChannelInput(text)).toEqual(expected);
  });

  it('returns null for ambiguous or unknown text without a hint', () => {
    expect(parseChannelInput('+420 777 123 456')).toBeNull();
    expect(parseChannelInput('@jan.novak')).toBeNull();
    expect(parseChannelInput('hello world')).toBeNull();
    expect(parseChannelInput('https://example.com/jan')).toBeNull();
  });

  it('uses the hint for phones, normalizing to E.164 with the default country', () => {
    expect(parseChannelInput('777 123 456', 'WHATSAPP', 'CZ')).toEqual({
      type: 'WHATSAPP',
      handle: '+420777123456',
    });
    expect(parseChannelInput('+420 777 123 456', 'SIGNAL')).toEqual({
      type: 'SIGNAL',
      handle: '+420777123456',
    });
    expect(parseChannelInput('12', 'SMS', 'CZ')).toBeNull();
  });

  it('uses the hint for bare usernames and validates them per platform', () => {
    expect(parseChannelInput('@jan.novak', 'INSTAGRAM')).toEqual({
      type: 'INSTAGRAM',
      handle: 'jan.novak',
    });
    expect(parseChannelInput('jan', 'TELEGRAM')).toBeNull();
    expect(parseChannelInput('jan novak', 'INSTAGRAM')).toBeNull();
  });

  it('accepts a phone or an email for iMessage and an email for EMAIL', () => {
    expect(parseChannelInput('jan@example.com', 'IMESSAGE')).toEqual({
      type: 'IMESSAGE',
      handle: 'jan@example.com',
    });
    expect(parseChannelInput('777123456', 'IMESSAGE', 'CZ')).toEqual({
      type: 'IMESSAGE',
      handle: '+420777123456',
    });
    expect(parseChannelInput('777123456', 'EMAIL', 'CZ')).toBeNull();
  });

  it('lets a recognized link win over the hint', () => {
    expect(parseChannelInput('https://t.me/jan_novak', 'INSTAGRAM')).toEqual({
      type: 'TELEGRAM',
      handle: 'jan_novak',
    });
  });

  it('never parses OTHER', () => {
    expect(parseChannelInput('https://discord.com/users/1', 'OTHER')).toBeNull();
  });
});
```

`client/src/lib/channels.test.ts`:

```ts
import { CHANNEL_PLATFORMS, CHANNEL_TYPES, formatHandle } from '@/lib/channels';

it('lists every platform once', () => {
  expect(new Set(CHANNEL_TYPES).size).toBe(Object.keys(CHANNEL_PLATFORMS).length);
});

it('formats handles for display', () => {
  expect(formatHandle('INSTAGRAM', 'jan.novak')).toBe('@jan.novak');
  expect(formatHandle('TELEGRAM', 'jan_novak')).toBe('@jan_novak');
  expect(formatHandle('WHATSAPP', '+420777123456')).toBe('+420 777 123 456');
  expect(formatHandle('EMAIL', 'jan@example.com')).toBe('jan@example.com');
  expect(formatHandle('OTHER', 'Discord')).toBe('Discord');
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter @nudge/client test -- channel-input channels.test`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement platform metadata**

`client/src/lib/channels.ts`:

```ts
import { getLocales } from 'expo-localization';
import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

import type { ChannelType } from '@/api/types';

export type ChannelInputKind = 'phone' | 'username' | 'email' | 'phoneOrEmail' | 'other';

export type ChannelPlatform = {
  label: string;
  input: ChannelInputKind;
  /** One line telling the user where to copy a profile link from. */
  howTo?: string;
  /** Opens the app so the user can copy that link. */
  appUrl?: string;
};

export const CHANNEL_PLATFORMS: Record<ChannelType, ChannelPlatform> = {
  WHATSAPP: { label: 'WhatsApp', input: 'phone' },
  INSTAGRAM: {
    label: 'Instagram',
    input: 'username',
    howTo: 'In Instagram: their profile → ⋯ → Copy profile URL',
    appUrl: 'https://www.instagram.com/',
  },
  MESSENGER: {
    label: 'Messenger',
    input: 'username',
    howTo: 'In Facebook: their profile → ⋯ → Copy link',
    appUrl: 'https://www.facebook.com/',
  },
  TELEGRAM: {
    label: 'Telegram',
    input: 'username',
    howTo: 'In Telegram: their profile → Username',
    appUrl: 'https://t.me/',
  },
  SIGNAL: { label: 'Signal', input: 'phone' },
  IMESSAGE: { label: 'iMessage', input: 'phoneOrEmail' },
  SMS: { label: 'SMS', input: 'phone' },
  PHONE: { label: 'Phone', input: 'phone' },
  EMAIL: { label: 'Email', input: 'email' },
  OTHER: { label: 'Other', input: 'other' },
};

/** Display order of the platform grid. */
export const CHANNEL_TYPES = Object.keys(CHANNEL_PLATFORMS) as ChannelType[];

/** The device's region, used as the default country for numbers typed without +. */
export function deviceCountry(): CountryCode | undefined {
  return (getLocales()[0]?.regionCode ?? undefined) as CountryCode | undefined;
}

export function formatHandle(type: ChannelType, handle: string): string {
  const { input } = CHANNEL_PLATFORMS[type];
  if (input === 'username') return `@${handle}`;
  if (handle.startsWith('+')) {
    return parsePhoneNumberFromString(handle)?.formatInternational() ?? handle;
  }
  return handle;
}
```

- [ ] **Step 5: Implement the parser**

`client/src/lib/channel-input.ts`:

```ts
import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

import type { ChannelType } from '@/api/types';
import { CHANNEL_PLATFORMS } from '@/lib/channels';

export type ParsedChannel = { type: ChannelType; handle: string };

// Mirrors the server's rules; the server stays authoritative.
const USERNAMES: Partial<Record<ChannelType, RegExp>> = {
  TELEGRAM: /^[A-Za-z0-9_]{5,32}$/,
  INSTAGRAM: /^[A-Za-z0-9._]{1,30}$/,
  MESSENGER: /^[A-Za-z0-9.]{5,50}$/,
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOST = String.raw`^(?:https?:\/\/)?(?:www\.|m\.)?`;
const TAIL = String.raw`\/?(?:[?#].*)?$`;

/** Profile/chat URLs people copy from each app, in match order. */
const LINKS: { type: ChannelType; pattern: RegExp; phone?: boolean }[] = [
  {
    type: 'INSTAGRAM',
    pattern: new RegExp(`${HOST}instagram\\.com\\/([A-Za-z0-9._]{1,30})${TAIL}`),
  },
  { type: 'INSTAGRAM', pattern: new RegExp(`${HOST}ig\\.me\\/m\\/([A-Za-z0-9._]{1,30})${TAIL}`) },
  {
    type: 'MESSENGER',
    pattern: new RegExp(`${HOST}facebook\\.com\\/profile\\.php\\?(?:.*&)?id=(\\d{5,50})`),
  },
  { type: 'MESSENGER', pattern: new RegExp(`${HOST}facebook\\.com\\/([A-Za-z0-9.]{5,50})${TAIL}`) },
  { type: 'MESSENGER', pattern: new RegExp(`${HOST}m\\.me\\/([A-Za-z0-9.]{5,50})${TAIL}`) },
  { type: 'TELEGRAM', pattern: new RegExp(`${HOST}t\\.me\\/([A-Za-z0-9_]{5,32})${TAIL}`) },
  { type: 'WHATSAPP', pattern: new RegExp(`${HOST}wa\\.me\\/(\\d{7,15})${TAIL}`), phone: true },
  { type: 'SIGNAL', pattern: /^(?:https?:\/\/)?signal\.me\/#p\/(\+\d{7,15})$/, phone: true },
];

function e164(text: string, country?: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(text, country);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Turns pasted or typed text into a channel. A recognized link decides the platform by
 * itself; bare phones, usernames and emails need `hint` (the platform the user picked),
 * except an email, which defaults to EMAIL.
 */
export function parseChannelInput(
  text: string,
  hint?: ChannelType,
  defaultCountry?: CountryCode,
): ParsedChannel | null {
  const trimmed = text.trim();
  if (!trimmed || hint === 'OTHER') return null;

  for (const { type, pattern, phone } of LINKS) {
    const match = pattern.exec(trimmed);
    if (!match?.[1]) continue;
    if (!phone) return { type, handle: match[1] };
    const handle = e164(match[1].startsWith('+') ? match[1] : `+${match[1]}`);
    return handle ? { type, handle } : null;
  }
  if (/^https?:\/\//i.test(trimmed)) return null;

  const input = hint ? CHANNEL_PLATFORMS[hint].input : undefined;
  if (EMAIL.test(trimmed)) {
    if (!hint) return { type: 'EMAIL', handle: trimmed };
    return input === 'email' || input === 'phoneOrEmail' ? { type: hint, handle: trimmed } : null;
  }
  if (!hint) return null;

  if (input === 'phone' || input === 'phoneOrEmail') {
    const handle = e164(trimmed, defaultCountry);
    return handle ? { type: hint, handle } : null;
  }
  if (input === 'username') {
    const handle = trimmed.replace(/^@/, '');
    return USERNAMES[hint]?.test(handle) ? { type: hint, handle } : null;
  }
  return null;
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @nudge/client test -- channel-input channels.test && pnpm --filter @nudge/client typecheck`
Expected: PASS. If `+420 777 123 456` style assertions fail on `formatHandle`, check `formatInternational()` output for that number and adjust the expected string in the test (not the code). If jest can't import `expo-localization`, add `jest.mock('expo-localization', () => ({ getLocales: () => [{ regionCode: 'CZ' }] }))` to `client/src/test/setup.ts`.

- [ ] **Step 7: Commit**

```bash
git add client/package.json pnpm-lock.yaml client/src/lib client/src/test
git commit -m "feat(client): channel platform metadata and paste/typing parser"
```

---

### Task 6: `ChannelList` component

**Files:**

- Create: `client/src/components/friend/channel-list.tsx`
- Create: `client/src/components/friend/channel-list.stories.tsx`
- Test: `client/src/components/friend/channel-list.test.tsx`

**Interfaces:**

- Consumes: `Channel` type; `CHANNEL_PLATFORMS`, `formatHandle`.
- Produces: `ChannelList({ channels, onOpen, onEdit, onAdd }: ChannelListProps)` where `onOpen(channel: Channel)`, `onEdit(channel: Channel)`, `onAdd()`. Accessibility: row button `Open <Label>`, edit button `Edit <Label>`, add button `Add a way to reach`.

- [ ] **Step 1: Stories**

`client/src/components/friend/channel-list.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import type { Channel } from '@/api/types';

import { ChannelList } from './channel-list';

const CHANNELS: Channel[] = [
  {
    id: 'c1',
    type: 'WHATSAPP',
    handle: '+420777123456',
    deepLink: null,
    link: 'https://wa.me/420777123456',
  },
  {
    id: 'c2',
    type: 'INSTAGRAM',
    handle: 'jan.novak',
    deepLink: null,
    link: 'https://ig.me/m/jan.novak',
  },
];

const meta = {
  title: 'Components/ChannelList',
  component: ChannelList,
  args: { channels: CHANNELS, onOpen: fn(), onEdit: fn(), onAdd: fn() },
} satisfies Meta<typeof ChannelList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { channels: [] } };
```

- [ ] **Step 2: Write the failing test**

`client/src/components/friend/channel-list.test.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ChannelList } from './channel-list';
import * as stories from './channel-list.stories';

const { Default } = composeStories(stories);

describe('ChannelList', () => {
  it('shows each channel with its platform and handle', async () => {
    await render(<Default />);
    expect(screen.getByText('WhatsApp')).toBeOnTheScreen();
    expect(screen.getByText('+420 777 123 456')).toBeOnTheScreen();
    expect(screen.getByText('@jan.novak')).toBeOnTheScreen();
  });

  it('opens, edits and adds', async () => {
    const onOpen = jest.fn();
    const onEdit = jest.fn();
    const onAdd = jest.fn();
    await render(<Default onOpen={onOpen} onEdit={onEdit} onAdd={onAdd} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Open Instagram' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2' }));
    await userEvent.setup().press(screen.getByRole('button', { name: 'Edit WhatsApp' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add a way to reach' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('invites adding the first channel when empty', async () => {
    await renderWithTheme(
      <ChannelList channels={[]} onOpen={() => {}} onEdit={() => {}} onAdd={() => {}} />,
    );
    expect(screen.getByText(/Add WhatsApp, Instagram/)).toBeOnTheScreen();
  });
});

describeStories('ChannelList', stories);

it('matches the default story snapshot', async () => {
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm --filter @nudge/client test -- channel-list`
Expected: FAIL — `Cannot find module './channel-list'`.

- [ ] **Step 4: Implement**

`client/src/components/friend/channel-list.tsx`:

```tsx
import { Pressable, View } from 'react-native';

import type { Channel } from '@/api/types';
import { CHANNEL_PLATFORMS, formatHandle } from '@/lib/channels';
import { type Theme, useStyles } from '@/theme';
import { IconButton, Text } from '@/ui';

export type ChannelListProps = {
  channels: Channel[];
  /** Tapping a row opens the chat, which records contact. */
  onOpen: (channel: Channel) => void;
  onEdit: (channel: Channel) => void;
  onAdd: () => void;
};

/** "Contact via": the friend's channels, one tap to open each conversation. */
export function ChannelList({ channels, onOpen, onEdit, onAdd }: ChannelListProps) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="body" style={styles.title}>
          Contact via
        </Text>
        <IconButton icon="plus" accessibilityLabel="Add a way to reach" onPress={onAdd} />
      </View>
      {channels.length === 0 ? (
        <Text color="secondary">
          Add WhatsApp, Instagram or another app to reach them in one tap.
        </Text>
      ) : (
        channels.map((channel) => {
          const { label } = CHANNEL_PLATFORMS[channel.type];
          return (
            <View key={channel.id} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${label}`}
                onPress={() => onOpen(channel)}
                style={({ pressed }) => [styles.open, pressed && styles.pressed]}
              >
                <Text variant="body">{label}</Text>
                <Text color="secondary">{formatHandle(channel.type, channel.handle)}</Text>
              </Pressable>
              <IconButton
                icon="pencil"
                accessibilityLabel={`Edit ${label}`}
                onPress={() => onEdit(channel)}
              />
            </View>
          );
        })
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  root: { gap: theme.spacing[3] },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  title: { fontFamily: theme.typography.title.fontFamily },
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing[2] },
  open: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minHeight: theme.sizes.input,
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  pressed: { opacity: 0.7 },
});
```

- [ ] **Step 5: Run tests (writes the snapshot)**

Run: `pnpm --filter @nudge/client test -- channel-list && pnpm --filter @nudge/client typecheck`
Expected: PASS; one new snapshot written. If `+420 777 123 456` differs, align with Task 5's `formatHandle` expectation.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/friend/channel-list*
git commit -m "feat(client): Contact via channel list"
```

---

### Task 7: `ChannelModal` (platform → details → confirm) with clipboard and contacts

**Files:**

- Modify: `client/package.json` (via `expo install`), `client/app.json`
- Create: `client/src/lib/device-input.ts`
- Create: `client/src/components/friend/channel-modal.tsx`
- Create: `client/src/components/friend/channel-modal.stories.tsx`
- Test: `client/src/components/friend/channel-modal.test.tsx`

**Interfaces:**

- Consumes: `Channel`, `ChannelType`, `CreateChannelBody`, `UpdateChannelBody`; `CHANNEL_PLATFORMS`, `CHANNEL_TYPES`, `formatHandle`, `deviceCountry`; `parseChannelInput`.
- Produces:
  - `readClipboard(): Promise<string>` and `pickContactValues(): Promise<string[] | null>` in `@/lib/device-input`.
  - `ChannelModal(props: ChannelModalProps)`:
    ```ts
    type ChannelModalProps = {
      visible: boolean;
      /** The channel being edited; omit to add a new one. */
      channel?: Channel;
      onCreate: (body: CreateChannelBody) => void;
      onUpdate: (body: UpdateChannelBody) => void;
      onDelete: () => void;
      /** Opens the saved channel's link without recording contact (edit mode only). */
      onTest: (channel: Channel) => void;
      onClose: () => void;
      saving?: boolean;
      error?: string;
    };
    ```

- [ ] **Step 1: Install and configure native modules**

Run: `cd client && npx expo install expo-clipboard expo-contacts && cd ..`

In `client/app.json`, add to `expo.plugins` after `"expo-sqlite"`:

```json
[
  "expo-contacts",
  {
    "contactsPermission": "Allow $(PRODUCT_NAME) to read a contact you pick, to fill in a friend's phone number or email."
  }
]
```

Before writing `device-input.ts`, open https://docs.expo.dev/versions/v57.0.0/sdk/contacts/ and confirm the picker API. As of this plan it is the class API `Contact.presentPicker()` → `Contact | null`, then `contact.getPhones()` (`{ label, number }[]`) and `contact.getEmails()` (`{ label, address }[]`), with `Contact.requestPermissionsAsync()` first. The legacy `presentContactPickerAsync` throws at runtime. If the docs differ, adapt only `pickContactValues` and keep its signature.

- [ ] **Step 2: Device wrappers**

`client/src/lib/device-input.ts`:

```ts
import * as Clipboard from 'expo-clipboard';
import { Contact } from 'expo-contacts';

/** Clipboard text, or '' when empty or when iOS paste permission is denied. */
export async function readClipboard(): Promise<string> {
  if (!(await Clipboard.hasStringAsync())) return '';
  return Clipboard.getStringAsync();
}

/** Opens the system contact picker; returns the picked contact's phones and emails, or null. */
export async function pickContactValues(): Promise<string[] | null> {
  const permission = await Contact.requestPermissionsAsync();
  if (!permission.granted) return null;
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const [phones, emails] = await Promise.all([contact.getPhones(), contact.getEmails()]);
  return [...phones.map((phone) => phone.number), ...emails.map((email) => email.address)].filter(
    (value): value is string => Boolean(value),
  );
}
```

- [ ] **Step 3: Stories**

`client/src/components/friend/channel-modal.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ChannelModal } from './channel-modal';

const meta = {
  title: 'Components/ChannelModal',
  component: ChannelModal,
  args: {
    visible: true,
    onCreate: fn(),
    onUpdate: fn(),
    onDelete: fn(),
    onTest: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ChannelModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = {
  args: {
    channel: {
      id: 'c1',
      type: 'INSTAGRAM',
      handle: 'jan.novak',
      deepLink: null,
      link: 'https://ig.me/m/jan.novak',
    },
  },
};

export const WithError: Story = { args: { error: 'This friend already has that channel' } };
```

- [ ] **Step 4: Write the failing tests**

`client/src/components/friend/channel-modal.test.tsx`:

```tsx
import { composeStories } from '@storybook/react';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { Channel } from '@/api/types';
import { pickContactValues, readClipboard } from '@/lib/device-input';
import { renderWithTheme } from '@/test/render';
import { describeStories } from '@/test/stories';

import { ChannelModal, type ChannelModalProps } from './channel-modal';
import * as stories from './channel-modal.stories';

jest.mock('@/lib/device-input');
jest.mock('@/lib/channels', () => ({
  ...jest.requireActual('@/lib/channels'),
  deviceCountry: () => 'CZ',
}));

const CHANNEL: Channel = {
  id: 'c1',
  type: 'INSTAGRAM',
  handle: 'jan.novak',
  deepLink: null,
  link: 'https://ig.me/m/jan.novak',
};

function props(overrides: Partial<ChannelModalProps> = {}): ChannelModalProps {
  return {
    visible: true,
    onCreate: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    onTest: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

const user = () => userEvent.setup();

beforeEach(() => {
  jest.mocked(readClipboard).mockResolvedValue('');
  jest.mocked(pickContactValues).mockResolvedValue(null);
});

afterEach(() => jest.restoreAllMocks());

describe('ChannelModal', () => {
  it('adds a phone channel: platform → number → confirm → save', async () => {
    const p = props();
    await renderWithTheme(<ChannelModal {...p} />);
    await user().press(screen.getByRole('button', { name: 'WhatsApp' }));
    await user().type(screen.getByLabelText('Phone number'), '777 123 456');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('WhatsApp · +420 777 123 456')).toBeOnTheScreen();
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onCreate).toHaveBeenCalledWith({ type: 'WHATSAPP', handle: '+420777123456' });
  });

  it('shows an inline error for input that does not parse', async () => {
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Telegram' }));
    await user().type(screen.getByLabelText('Username'), 'ab');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    expect(
      screen.getByText("That doesn't look like a Telegram username or link."),
    ).toBeOnTheScreen();
  });

  it('offers a recognized clipboard link and jumps to confirm', async () => {
    jest.mocked(readClipboard).mockResolvedValue('https://www.instagram.com/jan.novak?igsh=x');
    const p = props();
    await renderWithTheme(<ChannelModal {...p} />);
    const suggestion = await screen.findByRole('button', { name: 'Use Instagram @jan.novak' });
    await user().press(suggestion);
    expect(screen.getByText('Instagram · @jan.novak')).toBeOnTheScreen();
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onCreate).toHaveBeenCalledWith({ type: 'INSTAGRAM', handle: 'jan.novak' });
  });

  it('re-reads the clipboard when the app returns to the foreground', async () => {
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    });
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Instagram' }));
    jest.mocked(readClipboard).mockResolvedValue('https://instagram.com/jan.novak');
    await act(async () => listeners.forEach((listener) => listener('active')));
    expect(
      await screen.findByRole('button', { name: 'Use Instagram @jan.novak' }),
    ).toBeOnTheScreen();
  });

  it('fills a phone from a picked contact, asking which value when there are several', async () => {
    jest.mocked(pickContactValues).mockResolvedValue(['+420 777 123 456', '+420 602 000 111']);
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Signal' }));
    await user().press(screen.getByRole('button', { name: 'Pick from contacts' }));
    await user().press(await screen.findByText('+420 602 000 111'));
    expect(screen.getByLabelText('Phone number')).toHaveDisplayValue('+420 602 000 111');
  });

  it('pastes into the field', async () => {
    jest.mocked(readClipboard).mockResolvedValue('');
    await renderWithTheme(<ChannelModal {...props()} />);
    await user().press(screen.getByRole('button', { name: 'Instagram' }));
    jest.mocked(readClipboard).mockResolvedValue('@jan.novak');
    await user().press(screen.getByRole('button', { name: 'Paste' }));
    await waitFor(() => expect(screen.getByLabelText('Username')).toHaveDisplayValue('@jan.novak'));
  });

  it('adds OTHER with a label and a link', async () => {
    const p = props();
    await renderWithTheme(<ChannelModal {...p} />);
    await user().press(screen.getByRole('button', { name: 'Other' }));
    await user().type(screen.getByLabelText('Label'), 'Discord');
    await user().type(screen.getByLabelText('Link'), 'https://discord.com/users/1');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onCreate).toHaveBeenCalledWith({
      type: 'OTHER',
      handle: 'Discord',
      deepLink: 'https://discord.com/users/1',
    });
  });

  it('edits: starts at details with the handle, updates, tests and deletes', async () => {
    const p = props({ channel: CHANNEL });
    await renderWithTheme(<ChannelModal {...p} />);
    expect(screen.getByLabelText('Username')).toHaveDisplayValue('jan.novak');
    await user().press(screen.getByRole('button', { name: 'Test' }));
    expect(p.onTest).toHaveBeenCalledWith(CHANNEL);
    await user().press(screen.getByRole('button', { name: 'Delete' }));
    expect(p.onDelete).toHaveBeenCalledTimes(1);
    await user().clear(screen.getByLabelText('Username'));
    await user().type(screen.getByLabelText('Username'), 'jan.novak2');
    await user().press(screen.getByRole('button', { name: 'Continue' }));
    await user().press(screen.getByRole('button', { name: 'Save' }));
    expect(p.onUpdate).toHaveBeenCalledWith({ handle: 'jan.novak2' });
  });

  it('shows the submit error and closes from Cancel', async () => {
    const p = props({ error: 'This friend already has that channel' });
    await renderWithTheme(<ChannelModal {...p} />);
    expect(screen.getByText('This friend already has that channel')).toBeOnTheScreen();
    await user().press(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });
});

describeStories('ChannelModal', stories);

it('matches the default story snapshot', async () => {
  const { Default } = composeStories(stories);
  expect((await render(<Default />)).toJSON()).toMatchSnapshot();
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm --filter @nudge/client test -- channel-modal`
Expected: FAIL — `Cannot find module './channel-modal'`.

- [ ] **Step 6: Implement**

`client/src/components/friend/channel-modal.tsx`:

```tsx
import { useEffect, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Channel, ChannelType, CreateChannelBody, UpdateChannelBody } from '@/api/types';
import { type ParsedChannel, parseChannelInput } from '@/lib/channel-input';
import { CHANNEL_PLATFORMS, CHANNEL_TYPES, deviceCountry, formatHandle } from '@/lib/channels';
import { pickContactValues, readClipboard } from '@/lib/device-input';
import { type Theme, useStyles } from '@/theme';
import { Button, ChoiceChips, Input, Text } from '@/ui';

export type ChannelModalProps = {
  visible: boolean;
  /** The channel being edited; omit to add a new one. */
  channel?: Channel;
  onCreate: (body: CreateChannelBody) => void;
  onUpdate: (body: UpdateChannelBody) => void;
  onDelete: () => void;
  /** Opens the saved channel's link without recording contact (edit mode only). */
  onTest: (channel: Channel) => void;
  onClose: () => void;
  saving?: boolean;
  /** Request failure shown under the header. */
  error?: string;
};

type Step =
  | { step: 'platform' }
  | { step: 'details'; type: ChannelType }
  | { step: 'confirm'; type: ChannelType; handle: string; deepLink?: string };

const FIELD_LABEL = {
  phone: 'Phone number',
  phoneOrEmail: 'Phone number or email',
  username: 'Username',
  email: 'Email',
  other: 'Label',
} as const;

const KIND_NOUN = {
  phone: 'phone number',
  phoneOrEmail: 'phone number or email',
  username: 'username or link',
  email: 'email',
  other: 'label',
} as const;

/** Add or edit a way to reach a friend: pick the platform, enter details, confirm. */
export function ChannelModal({ visible, ...props }: ChannelModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      {/* Mounted per opening so every add starts at the platform grid. */}
      {visible ? <ChannelEditor {...props} /> : null}
    </Modal>
  );
}

function ChannelEditor({
  channel,
  onCreate,
  onUpdate,
  onDelete,
  onTest,
  onClose,
  saving = false,
  error,
}: Omit<ChannelModalProps, 'visible'>) {
  const styles = useStyles(makeStyles);
  const [state, setState] = useState<Step>(
    channel ? { step: 'details', type: channel.type } : { step: 'platform' },
  );
  const [value, setValue] = useState(channel?.handle ?? '');
  const [link, setLink] = useState(channel?.deepLink ?? '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ParsedChannel | null>(null);
  const [contactValues, setContactValues] = useState<string[]>([]);

  // Copying a profile link in another app and coming back offers it here.
  useEffect(() => {
    if (channel) return;
    const check = () =>
      readClipboard()
        .then((text) => setSuggestion(parseChannelInput(text, undefined, deviceCountry())))
        .catch(() => setSuggestion(null));
    check();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => subscription.remove();
  }, [channel]);

  const confirm = (next: ParsedChannel) => {
    setInputError(null);
    setState({ step: 'confirm', ...next });
  };

  const submitDetails = (type: ChannelType) => {
    const { input, label } = CHANNEL_PLATFORMS[type];
    if (input === 'other') {
      if (!value.trim() || !/^(https:\/\/|tel:|sms:|mailto:)\S+$/.test(link.trim())) {
        setInputError('Add a label and a link starting with https://, tel:, sms: or mailto:.');
        return;
      }
      setInputError(null);
      setState({ step: 'confirm', type, handle: value.trim(), deepLink: link.trim() });
      return;
    }
    const parsed = parseChannelInput(value, type, deviceCountry());
    if (!parsed) {
      setInputError(`That doesn't look like a ${label} ${KIND_NOUN[input]}.`);
      return;
    }
    confirm(parsed);
  };

  const save = (current: Extract<Step, { step: 'confirm' }>) => {
    if (channel) {
      onUpdate({
        handle: current.handle,
        ...(current.deepLink !== undefined ? { deepLink: current.deepLink } : {}),
      });
    } else {
      onCreate({
        type: current.type,
        handle: current.handle,
        ...(current.deepLink !== undefined ? { deepLink: current.deepLink } : {}),
      });
    }
  };

  const paste = async () => setValue(await readClipboard());

  const pickContact = async () => {
    const values = await pickContactValues();
    if (!values?.length) return;
    if (values.length === 1) setValue(values[0]!);
    else setContactValues(values);
  };

  const title = channel ? `Edit ${CHANNEL_PLATFORMS[channel.type].label}` : 'Add a way to reach';

  return (
    <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onClose}
            hitSlop={8}
          >
            <Text variant="body" color="secondary">
              Cancel
            </Text>
          </Pressable>
          <Text variant="body" style={styles.title}>
            {title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? (
            <Text variant="caption" style={styles.error}>
              {error}
            </Text>
          ) : null}

          {suggestion && state.step !== 'confirm' ? (
            <Button
              variant="accent"
              label={`Use ${CHANNEL_PLATFORMS[suggestion.type].label} ${formatHandle(suggestion.type, suggestion.handle)}`}
              onPress={() => confirm(suggestion)}
            />
          ) : null}

          {state.step === 'platform' ? (
            <View style={styles.grid}>
              {CHANNEL_TYPES.map((type) => (
                <Button
                  key={type}
                  label={CHANNEL_PLATFORMS[type].label}
                  onPress={() => {
                    setValue('');
                    setLink('');
                    setInputError(null);
                    setContactValues([]);
                    setState({ step: 'details', type });
                  }}
                  style={styles.tile}
                />
              ))}
            </View>
          ) : null}

          {state.step === 'details' ? (
            <DetailsStep
              type={state.type}
              value={value}
              link={link}
              error={inputError ?? undefined}
              contactValues={contactValues}
              editing={Boolean(channel)}
              onChangeValue={(next) => {
                setValue(next);
                setInputError(null);
              }}
              onChangeLink={setLink}
              onPaste={paste}
              onPickContact={pickContact}
              onChooseContactValue={(next) => {
                setValue(next);
                setContactValues([]);
              }}
              onContinue={() => submitDetails(state.type)}
              onBack={() => setState({ step: 'platform' })}
              onTest={channel ? () => onTest(channel) : undefined}
              onDelete={channel ? onDelete : undefined}
            />
          ) : null}

          {state.step === 'confirm' ? (
            <View style={styles.section}>
              <Text variant="body">
                {`${CHANNEL_PLATFORMS[state.type].label} · ${formatHandle(state.type, state.handle)}`}
              </Text>
              {state.deepLink ? <Text color="secondary">{state.deepLink}</Text> : null}
              <Button label="Save" onPress={() => save(state)} loading={saving} />
              <Button
                variant="accent"
                label="Back"
                onPress={() => setState({ step: 'details', type: state.type })}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type DetailsStepProps = {
  type: ChannelType;
  value: string;
  link: string;
  error?: string;
  contactValues: string[];
  editing: boolean;
  onChangeValue: (value: string) => void;
  onChangeLink: (value: string) => void;
  onPaste: () => void;
  onPickContact: () => void;
  onChooseContactValue: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onTest?: () => void;
  onDelete?: () => void;
};

function DetailsStep({
  type,
  value,
  link,
  error,
  contactValues,
  editing,
  onChangeValue,
  onChangeLink,
  onPaste,
  onPickContact,
  onChooseContactValue,
  onContinue,
  onBack,
  onTest,
  onDelete,
}: DetailsStepProps) {
  const styles = useStyles(makeStyles);
  const platform = CHANNEL_PLATFORMS[type];
  const phoneLike = platform.input === 'phone' || platform.input === 'phoneOrEmail';

  return (
    <View style={styles.section}>
      <Input
        label={FIELD_LABEL[platform.input]}
        value={value}
        onChangeText={onChangeValue}
        error={platform.input === 'other' ? undefined : error}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={
          platform.input === 'phone'
            ? 'phone-pad'
            : platform.input === 'email'
              ? 'email-address'
              : 'default'
        }
      />
      {platform.input === 'other' ? (
        <Input
          label="Link"
          value={link}
          onChangeText={onChangeLink}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      ) : null}
      {platform.howTo ? <Text color="secondary">{platform.howTo}</Text> : null}
      <View style={styles.actions}>
        {platform.input === 'other' ? null : (
          <Button variant="accent" label="Paste" onPress={onPaste} />
        )}
        {phoneLike ? (
          <Button variant="accent" label="Pick from contacts" onPress={onPickContact} />
        ) : null}
        {platform.appUrl ? (
          <Button
            variant="accent"
            label={`Open ${platform.label}`}
            onPress={() => Linking.openURL(platform.appUrl!).catch(() => {})}
          />
        ) : null}
      </View>
      {contactValues.length > 1 ? (
        <ChoiceChips
          label="Which one?"
          options={contactValues.map((option) => ({ label: option, value: option }))}
          value={value}
          onChange={onChooseContactValue}
        />
      ) : null}
      <Button label="Continue" onPress={onContinue} />
      {editing ? (
        <View style={styles.actions}>
          {onTest ? <Button variant="accent" label="Test" onPress={onTest} /> : null}
          {onDelete ? <Button variant="accent" label="Delete" onPress={onDelete} /> : null}
        </View>
      ) : (
        <Button variant="accent" label="Back" onPress={onBack} />
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) => ({
  sheet: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: theme.spacing[5],
  },
  // Balances the Cancel link so the title stays centred.
  headerSpacer: { width: theme.sizes.input },
  title: { fontFamily: theme.typography.title.fontFamily },
  body: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  error: { color: theme.colors.danger },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing[3] },
  tile: { minWidth: '30%' as const, flexGrow: 1 },
  section: { gap: theme.spacing[3] },
  actions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: theme.spacing[2] },
});
```

Check that `ChoiceChips`' `options`/`value`/`onChange` props match `client/src/ui/choice-chips/choice-chips.tsx` (it's generic over the value type in `friend-profile.tsx`), and that the chip label renders as text so `findByText('+420 602 000 111')` works.

- [ ] **Step 7: Run tests (writes the snapshot)**

Run: `pnpm --filter @nudge/client test -- channel-modal && pnpm --filter @nudge/client typecheck`
Expected: PASS. Common fixes if red: if `jest.mock('@/lib/device-input')` automock can't load native `expo-contacts`/`expo-clipboard`, switch to a factory `jest.mock('@/lib/device-input', () => ({ readClipboard: jest.fn(), pickContactValues: jest.fn() }))`. If the AppState test's listener list stays empty, confirm the effect subscribes with `AppState.addEventListener('change', …)`.

- [ ] **Step 8: Commit**

```bash
git add client/package.json pnpm-lock.yaml client/app.json client/src/lib/device-input.ts client/src/components/friend/channel-modal*
git commit -m "feat(client): add/edit channel modal with paste, clipboard and contact picker"
```

---

### Task 8: Wire channels into the friend screen (tap opens and records contact)

**Files:**

- Modify: `client/src/screens/friend-detail-screen.tsx`
- Test: `client/src/screens/friend-detail-screen.test.tsx`

**Interfaces:**

- Consumes: `ChannelList` (Task 6), `ChannelModal` (Task 7), `useCreateChannel`, `useUpdateChannel`, `useDeleteChannel`, `useOpenChannel` (Task 4), `CHANNEL_PLATFORMS` (Task 5).
- Produces: user-visible behaviour only.

- [ ] **Step 1: Write the failing tests**

In `client/src/screens/friend-detail-screen.test.tsx`:

- Add `import * as channelsApi from '@/api/channels';`, `jest.mock('@/api/channels');` and `jest.mock('@/lib/device-input', () => ({ readClipboard: jest.fn(async () => ''), pickContactValues: jest.fn(async () => null) }));`.
- Add `import { Linking } from 'react-native';`.
- Give the `FRIEND` fixture a channel (replacing the `channels: []` added in Task 4):

```ts
  channels: [
    {
      id: 'channel-1',
      type: 'WHATSAPP',
      handle: '+420777123456',
      deepLink: null,
      link: 'https://wa.me/420777123456',
    },
  ],
```

- In `beforeEach`:

```ts
jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
jest.mocked(channelsApi.openChannel).mockResolvedValue({
  lastContactAt: NOW.toISOString(),
  nudge: { ...FRIEND.nudge!, revision: 5 },
});
jest.mocked(channelsApi.createChannel).mockResolvedValue(FRIEND.channels[0]!);
```

- Add tests inside the `describe`:

```tsx
it('opens a channel, then records contact', async () => {
  await renderScreen(<FriendDetailScreen friendId="friend-1" />);
  await user().press(await screen.findByRole('button', { name: 'Open WhatsApp' }));
  expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/420777123456');
  await waitFor(() =>
    expect(channelsApi.openChannel).toHaveBeenCalledWith('friend-1', 'channel-1'),
  );
  expect(await screen.findByText('Marked Anastasia Kleisioni as contacted')).toBeOnTheScreen();
});

it('records nothing when the link cannot be opened', async () => {
  jest.mocked(Linking.openURL).mockRejectedValue(new Error('No app'));
  await renderScreen(<FriendDetailScreen friendId="friend-1" />);
  await user().press(await screen.findByRole('button', { name: 'Open WhatsApp' }));
  expect(await screen.findByText("Couldn't open WhatsApp")).toBeOnTheScreen();
  expect(channelsApi.openChannel).not.toHaveBeenCalled();
});

it('offers a retry when recording fails', async () => {
  jest.mocked(channelsApi.openChannel).mockRejectedValueOnce(new ApiError(500, 'Server down'));
  await renderScreen(<FriendDetailScreen friendId="friend-1" />);
  await user().press(await screen.findByRole('button', { name: 'Open WhatsApp' }));
  expect(
    await screen.findByText("Couldn't mark Anastasia Kleisioni as contacted"),
  ).toBeOnTheScreen();
  await user().press(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(channelsApi.openChannel).toHaveBeenCalledTimes(2));
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
});

it('adds a channel through the modal', async () => {
  await renderScreen(<FriendDetailScreen friendId="friend-1" />);
  await user().press(await screen.findByRole('button', { name: 'Add a way to reach' }));
  await user().press(screen.getByRole('button', { name: 'Instagram' }));
  await user().type(screen.getByLabelText('Username'), 'jan.novak');
  await user().press(screen.getByRole('button', { name: 'Continue' }));
  await user().press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(channelsApi.createChannel).toHaveBeenCalledWith('friend-1', {
      type: 'INSTAGRAM',
      handle: 'jan.novak',
    }),
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @nudge/client test -- friend-detail-screen`
Expected: FAIL — no `Open WhatsApp` button.

- [ ] **Step 3: Implement**

In `client/src/screens/friend-detail-screen.tsx`:

Imports:

```tsx
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  View,
} from 'react-native';

import type { CatchUp, Channel, Friend } from '@/api/types';
import {
  useCreateChannel,
  useDeleteChannel,
  useOpenChannel,
  useUpdateChannel,
} from '@/api/use-channel-mutations';
import { ChannelList } from '@/components/friend/channel-list';
import { ChannelModal } from '@/components/friend/channel-modal';
import { CHANNEL_PLATFORMS } from '@/lib/channels';
import { Button, IconButton, Text } from '@/ui';
```

Types next to `NoteSheet`:

```tsx
type ChannelSheet = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; channel: Channel };

/** Result of tapping a channel, shown under the profile (the app has no toast yet). */
type ChannelStatus =
  | { kind: 'recorded' }
  | { kind: 'open-failed'; label: string }
  | { kind: 'record-failed'; channel: Channel };
```

Inside `LoadedFriend`, after the existing hooks/state:

```tsx
const createChannel = useCreateChannel(friend.id);
const updateChannel = useUpdateChannel(friend.id);
const deleteChannel = useDeleteChannel(friend.id);
const openChannel = useOpenChannel(friend.id);
const [channelSheet, setChannelSheet] = useState<ChannelSheet>({ mode: 'closed' });
const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);

const recordOpen = (channel: Channel) =>
  openChannel.mutate(channel.id, {
    onSuccess: () => setChannelStatus({ kind: 'recorded' }),
    onError: () => setChannelStatus({ kind: 'record-failed', channel }),
  });

// Open first: only a chat that actually opened counts as contact.
const openInApp = async (channel: Channel) => {
  setChannelStatus(null);
  try {
    await Linking.openURL(channel.link);
  } catch {
    setChannelStatus({ kind: 'open-failed', label: CHANNEL_PLATFORMS[channel.type].label });
    return;
  }
  recordOpen(channel);
};

const closeChannelSheet = () => setChannelSheet({ mode: 'closed' });
const channelMutation =
  channelSheet.mode === 'edit'
    ? updateChannel.isError
      ? updateChannel
      : deleteChannel
    : createChannel;
```

In the list header, after the `contactError` block and before `notesHeader`:

```tsx
<ChannelList
  channels={friend.channels}
  onOpen={openInApp}
  onEdit={(channel) => {
    updateChannel.reset();
    deleteChannel.reset();
    setChannelSheet({ mode: 'edit', channel });
  }}
  onAdd={() => {
    createChannel.reset();
    setChannelSheet({ mode: 'create' });
  }}
/>;
{
  channelStatus?.kind === 'recorded' ? (
    <Text variant="caption">{`Marked ${friend.name} as contacted`}</Text>
  ) : null;
}
{
  channelStatus?.kind === 'open-failed' ? (
    <Text variant="caption" style={styles.error}>
      {`Couldn't open ${channelStatus.label}`}
    </Text>
  ) : null;
}
{
  channelStatus?.kind === 'record-failed' ? (
    <View style={styles.statusRow}>
      <Text variant="caption" style={styles.error}>
        {`Couldn't mark ${friend.name} as contacted`}
      </Text>
      <Button
        variant="accent"
        label="Retry"
        loading={openChannel.isPending}
        onPress={() => recordOpen(channelStatus.channel)}
      />
    </View>
  ) : null;
}
```

After `<NoteModal … />`:

```tsx
<ChannelModal
  visible={channelSheet.mode !== 'closed'}
  channel={channelSheet.mode === 'edit' ? channelSheet.channel : undefined}
  onCreate={(body) => createChannel.mutate(body, { onSuccess: closeChannelSheet })}
  onUpdate={(body) => {
    if (channelSheet.mode !== 'edit') return;
    updateChannel.mutate(
      { channelId: channelSheet.channel.id, body },
      { onSuccess: closeChannelSheet },
    );
  }}
  onDelete={() => {
    if (channelSheet.mode !== 'edit') return;
    deleteChannel.mutate(channelSheet.channel.id, { onSuccess: closeChannelSheet });
  }}
  onTest={(channel) => Linking.openURL(channel.link).catch(() => {})}
  onClose={closeChannelSheet}
  saving={createChannel.isPending || updateChannel.isPending || deleteChannel.isPending}
  error={channelMutation.isError ? channelMutation.error.message : undefined}
/>
```

Styles:

```tsx
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: theme.spacing[3],
  },
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @nudge/client test -- friend-detail-screen && pnpm --filter @nudge/client typecheck`
Expected: PASS, including the existing Contact/notes tests.

- [ ] **Step 5: Commit**

```bash
git add client/src/screens
git commit -m "feat(client): open a friend's channel from their profile and record contact"
```

---

### Task 9: Full verification and dev build

**Files:** none new.

- [ ] **Step 1: Run the whole suite**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm --filter @nudge/server test:e2e`
Expected: all green. Fix any lint/format issues with `pnpm format` and commit them.

- [ ] **Step 2: Update snapshots only if intentionally changed**

If an existing snapshot (for example `friend-profile`) changed only because a fixture gained `channels`, review the diff. If it's expected, run `pnpm --filter @nudge/client test -- -u <file>` and commit.

- [ ] **Step 3: Native build smoke test (manual; needs a device and EAS)**

`expo-contacts` and `expo-clipboard` are native modules, so the existing dev client must be rebuilt: `cd client && eas build --profile development --platform ios` (and/or android). Then on a device:

1. Add WhatsApp via "Pick from contacts", then tap it: WhatsApp opens the chat, and back in Nudge "Marked … as contacted" appears and Last Contact updates.
2. In Instagram, copy a profile URL and return to the open modal: the "Use Instagram @…" suggestion appears.
3. Uninstall/disable Signal, add a Signal channel and tap it: `signal.me` opens in the browser (a universal-link fallback, still counts as opened).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: verification fixes for friend channels"
```
