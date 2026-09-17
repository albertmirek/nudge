import type { DataSource } from 'typeorm';
import { CatchUp } from '../friends/entities/catch-up.entity.js';
import { FriendPeriodicity } from '../friends/entities/friend-periodicity.enum.js';
import { Friend } from '../friends/entities/friend.entity.js';
import { NudgeSchedulingService } from '../nudges/nudge-scheduling.service.js';
import { User } from '../users/entities/user.entity.js';

/** Matches the client's default `x-user-id`, Bruno's Local environment and devAuthMiddleware. */
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

const DAY_MS = 24 * 60 * 60 * 1000;

type SeedFriend = {
  name: string;
  periodicity: FriendPeriodicity;
  /** Days since the last catch-up; omit for a friend who has never been contacted. */
  lastContactDaysAgo?: number;
  note?: string;
  metAt?: string;
  livesIn?: string;
  birthday?: string;
  notes?: string;
};

// The nudge is planned from lastContactAt + periodicity by NudgeSchedulingService, so
// "days ago" past the period is overdue and within the period is upcoming.
const FRIENDS: SeedFriend[] = [
  // Overdue
  {
    name: 'Anastasia Kleisioni',
    periodicity: FriendPeriodicity.WEEKLY,
    lastContactDaysAgo: 40,
    note: 'Long call about her move',
    metAt: 'Erasmus in Lisbon',
    livesIn: 'Athens',
    birthday: '1996-03-12',
    notes: 'Ask about the new job.',
  },
  {
    name: 'Joni Trevo',
    periodicity: FriendPeriodicity.MONTHLY,
    lastContactDaysAgo: 55,
    note: 'Coffee downtown',
    livesIn: 'Helsinki',
  },
  {
    name: 'Marek Novák',
    periodicity: FriendPeriodicity.BIWEEKLY,
    lastContactDaysAgo: 20,
    note: 'Climbing',
    metAt: 'University',
    livesIn: 'Brno',
    birthday: '1994-11-02',
  },
  // Upcoming
  {
    name: 'Elia Cagnazo',
    periodicity: FriendPeriodicity.MONTHLY,
    lastContactDaysAgo: 10,
    note: 'Birthday wishes',
    livesIn: 'Milan',
    birthday: '1995-09-05',
  },
  {
    name: 'Sofia Lindqvist',
    periodicity: FriendPeriodicity.QUARTERLY,
    lastContactDaysAgo: 30,
    note: 'Video call',
    metAt: 'Conference in Berlin',
    livesIn: 'Stockholm',
  },
  {
    name: 'Tomás Ferreira',
    periodicity: FriendPeriodicity.WEEKLY,
    lastContactDaysAgo: 2,
    note: 'Quick chat',
    livesIn: 'Porto',
    notes: 'Loves hiking. Allergic to cats.',
  },
  // Never contacted: planned from creation, so upcoming by one period.
  { name: 'Priya Raman', periodicity: FriendPeriodicity.MONTHLY, metAt: 'Old workplace' },
];

export type SeedSummary = { friends: number; overdue: number; upcoming: number };

/**
 * Populates the dev user and a set of friends spanning overdue and upcoming nudges.
 * Re-running replaces the dev user's friends (and, via cascade, their nudges and catch-ups);
 * other users are untouched.
 */
export async function seedDevData(dataSource: DataSource): Promise<SeedSummary> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed dev data in production');
  }
  const scheduling = new NudgeSchedulingService();
  const now = Date.now();

  return dataSource.transaction(async (manager) => {
    await manager.upsert(
      User,
      { id: DEV_USER_ID, name: 'Sandra', timezone: 'Europe/Prague' },
      { conflictPaths: ['id'], skipUpdateIfNoValuesChanged: true },
    );
    await manager.delete(Friend, { userId: DEV_USER_ID });

    let overdue = 0;
    for (const seed of FRIENDS) {
      const lastContactAt =
        seed.lastContactDaysAgo === undefined
          ? null
          : new Date(now - seed.lastContactDaysAgo * DAY_MS);
      const friend = await manager.save(
        Friend,
        manager.create(Friend, {
          userId: DEV_USER_ID,
          name: seed.name,
          periodicity: seed.periodicity,
          lastContactAt,
          metAt: seed.metAt ?? null,
          livesIn: seed.livesIn ?? null,
          birthday: seed.birthday ?? null,
          notes: seed.notes ?? null,
        }),
      );
      if (lastContactAt) {
        await manager.save(
          CatchUp,
          manager.create(CatchUp, {
            friendId: friend.id,
            note: seed.note ?? null,
            createdAt: lastContactAt,
          }),
        );
      }
      const nudge = await scheduling.plan(manager, friend);
      if (nudge.scheduledFor.getTime() <= now) overdue += 1;
    }

    return { friends: FRIENDS.length, overdue, upcoming: FRIENDS.length - overdue };
  });
}
