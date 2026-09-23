import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { DataSource, QueryFailedError } from 'typeorm';
import { EmailCodePurpose } from '../src/auth/entities/email-code-purpose.enum.js';
import { EmailCode } from '../src/auth/entities/email-code.entity.js';
import { RefreshToken } from '../src/auth/entities/refresh-token.entity.js';
import { CatchUp } from '../src/friends/entities/catch-up.entity.js';
import { ChannelType } from '../src/friends/entities/channel-type.enum.js';
import { Channel } from '../src/friends/entities/channel.entity.js';
import { FriendPeriodicity } from '../src/friends/entities/friend-periodicity.enum.js';
import { Friend } from '../src/friends/entities/friend.entity.js';
import { NudgeStatus } from '../src/nudges/entities/nudge-status.enum.js';
import { Nudge } from '../src/nudges/entities/nudge.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { createTestApp, truncateAll, createUser as createTestUser } from './create-test-app.js';

describe('Entities (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(() => truncateAll(dataSource));

  afterAll(async () => {
    await app.close();
  });

  const createUser = (overrides?: Partial<User>) => createTestUser(dataSource, overrides);

  async function createFriend(user: User): Promise<Friend> {
    return dataSource
      .getRepository(Friend)
      .save({ userId: user.id, name: 'Alice', periodicity: FriendPeriodicity.MONTHLY });
  }

  it('applies column defaults on users', async () => {
    const user = await createUser();

    const found = await dataSource.getRepository(User).findOneByOrFail({ id: user.id });
    expect(found.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(found.preferredReminderLocalTime).toBe('18:00:00');
    expect(found.nudgeEnabled).toBe(true);
    expect(found.createdAt).toBeInstanceOf(Date);
  });

  it('loads a friend with its channels, catch-ups and nudge', async () => {
    const user = await createUser();
    const friend = await createFriend(user);
    await dataSource
      .getRepository(Channel)
      .save({ friendId: friend.id, type: ChannelType.WHATSAPP, deepLink: 'whatsapp://send' });
    await dataSource.getRepository(CatchUp).save({ friendId: friend.id, note: 'coffee' });
    await dataSource.getRepository(Nudge).save({
      userId: user.id,
      friendId: friend.id,
      scheduledFor: new Date('2026-10-01T16:00:00Z'),
    });

    const loaded = await dataSource.getRepository(Friend).findOneOrFail({
      where: { id: friend.id },
      relations: { user: true, channels: true, catchUps: true, nudge: true },
    });

    expect(loaded.user.id).toBe(user.id);
    expect(loaded.periodicity).toBe(FriendPeriodicity.MONTHLY);
    expect(loaded.lastContactAt).toBeNull();
    expect(loaded.channels).toEqual([
      expect.objectContaining({ type: ChannelType.WHATSAPP, deepLink: 'whatsapp://send' }),
    ]);
    expect(loaded.catchUps).toEqual([expect.objectContaining({ note: 'coffee' })]);
    expect(loaded.nudge).toEqual(
      expect.objectContaining({
        status: NudgeStatus.PLANNED,
        scheduledFor: new Date('2026-10-01T16:00:00Z'),
      }),
    );
  });

  it('rejects values outside the enums', async () => {
    const user = await createUser();

    await expect(
      dataSource
        .getRepository(Friend)
        .insert({ userId: user.id, name: 'Bob', periodicity: 'DAILY' as FriendPeriodicity }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('rejects a user without a timezone', async () => {
    await expect(
      dataSource.getRepository(User).insert({ email: 'tz@example.com' }),
    ).rejects.toMatchObject({
      driverError: { code: '23502', column: 'timezone' },
    });
  });

  it('rejects a friend without an existing user', async () => {
    await expect(
      dataSource.getRepository(Friend).insert({
        userId: '00000000-0000-0000-0000-000000000000',
        name: 'Ghost',
        periodicity: FriendPeriodicity.WEEKLY,
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('cascades a user delete to friends, channels, catch-ups and nudges', async () => {
    const user = await createUser();
    const friend = await createFriend(user);
    await dataSource
      .getRepository(Channel)
      .save({ friendId: friend.id, type: ChannelType.SMS, deepLink: 'sms:+420' });
    await dataSource.getRepository(CatchUp).save({ friendId: friend.id, note: null });
    await dataSource
      .getRepository(Nudge)
      .save({ userId: user.id, friendId: friend.id, scheduledFor: new Date() });

    await dataSource.getRepository(User).delete({ id: user.id });

    await expect(dataSource.getRepository(Friend).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Channel).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(CatchUp).count()).resolves.toBe(0);
    await expect(dataSource.getRepository(Nudge).count()).resolves.toBe(0);
  });

  it('bumps updated_at when a friend changes', async () => {
    const user = await createUser();
    const friend = await createFriend(user);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await dataSource.getRepository(Friend).update({ id: friend.id }, { name: 'Alicia' });

    const reloaded = await dataSource.getRepository(Friend).findOneByOrFail({ id: friend.id });
    expect(reloaded.name).toBe('Alicia');
    expect(reloaded.updatedAt.getTime()).toBeGreaterThan(friend.updatedAt.getTime());
  });

  it('stores auth credentials on users and keeps password_hash out of default selects', async () => {
    const user = await createUser({ email: 'a@example.com', passwordHash: 'x' });
    const reloaded = await dataSource.getRepository(User).findOneByOrFail({ id: user.id });
    expect(reloaded.email).toBe('a@example.com');
    expect(reloaded.emailVerifiedAt).toBeNull();
    expect(reloaded.passwordHash).toBeUndefined();
    const withHash = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: user.id })
      .getOneOrFail();
    expect(withHash.passwordHash).toBe('x');
  });

  it('rejects two users with the same email', async () => {
    await createUser({ email: 'dup@example.com' });
    await expect(createUser({ email: 'dup@example.com' })).rejects.toMatchObject({
      driverError: { code: '23505' },
    });
  });

  it('cascades refresh tokens and email codes when the user is deleted', async () => {
    const user = await createUser();
    await dataSource.getRepository(RefreshToken).save({
      userId: user.id,
      tokenHash: 'h',
      expiresAt: new Date(Date.now() + 1000),
    });
    await dataSource.getRepository(EmailCode).save({
      userId: user.id,
      purpose: EmailCodePurpose.VERIFY_EMAIL,
      codeHash: 'c',
      expiresAt: new Date(Date.now() + 1000),
    });
    await dataSource.getRepository(User).delete({ id: user.id });
    expect(await dataSource.getRepository(RefreshToken).count()).toBe(0);
    expect(await dataSource.getRepository(EmailCode).count()).toBe(0);
  });
});
