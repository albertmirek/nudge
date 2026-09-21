import { DataSource } from 'typeorm';
import { DEV_USER_ID, seedDevData } from '../src/database/seed.js';
import { Friend } from '../src/friends/entities/friend.entity.js';
import { FriendPeriodicity } from '../src/friends/entities/friend-periodicity.enum.js';
import { CatchUp } from '../src/friends/entities/catch-up.entity.js';
import { Nudge } from '../src/nudges/entities/nudge.entity.js';
import { NudgeStatus } from '../src/nudges/entities/nudge-status.enum.js';
import { User } from '../src/users/entities/user.entity.js';
import { createTestApp, truncateAll } from './create-test-app.js';

describe('Dev seed', () => {
  let dataSource: DataSource;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const testApp = await createTestApp();
    dataSource = testApp.dataSource;
    close = () => testApp.app.close();
  });
  beforeEach(() => truncateAll(dataSource));
  afterAll(() => close());

  it('creates the dev user with a mix of overdue and upcoming nudges', async () => {
    const summary = await seedDevData(dataSource);

    expect(await dataSource.getRepository(User).findOneBy({ id: DEV_USER_ID })).toMatchObject({
      timezone: 'Europe/Prague',
    });
    const friends = await dataSource
      .getRepository(Friend)
      .find({ where: { userId: DEV_USER_ID }, relations: { nudge: true } });
    expect(friends).toHaveLength(summary.friends);
    // Every friend has exactly one planned nudge, derived through the real scheduling service.
    expect(friends.every((friend) => friend.nudge?.status === NudgeStatus.PLANNED)).toBe(true);

    const now = Date.now();
    const overdue = friends.filter((friend) => friend.nudge!.scheduledFor.getTime() <= now);
    const upcoming = friends.filter((friend) => friend.nudge!.scheduledFor.getTime() > now);
    expect(overdue.length).toBeGreaterThanOrEqual(3);
    expect(upcoming.length).toBeGreaterThanOrEqual(3);
    expect(summary).toMatchObject({ overdue: overdue.length, upcoming: upcoming.length });

    // Contacted friends get a note written at that contact so the Notes list looks real.
    const catchUps = await dataSource.getRepository(CatchUp).find();
    expect(catchUps).toHaveLength(friends.filter((friend) => friend.lastContactAt).length);
  });

  it('is safe to re-run: replaces the dev user’s data instead of duplicating it', async () => {
    const first = await seedDevData(dataSource);
    const second = await seedDevData(dataSource);
    expect(second.friends).toBe(first.friends);
    expect(await dataSource.getRepository(Friend).countBy({ userId: DEV_USER_ID })).toBe(
      first.friends,
    );
    expect(await dataSource.getRepository(Nudge).count()).toBe(first.friends);
    expect(await dataSource.getRepository(User).count()).toBe(1);
  });

  it('leaves other users’ data alone', async () => {
    const other = await dataSource.getRepository(User).save({ timezone: 'UTC', name: 'Other' });
    await dataSource.getRepository(Friend).save({
      userId: other.id,
      name: 'Kept',
      periodicity: FriendPeriodicity.WEEKLY,
      lastContactAt: null,
    });

    await seedDevData(dataSource);

    expect(await dataSource.getRepository(Friend).countBy({ userId: other.id })).toBe(1);
  });

  it('refuses to run in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(seedDevData(dataSource)).rejects.toThrow(/production/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
