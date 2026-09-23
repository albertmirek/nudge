import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { FriendPeriodicity } from '../friends/entities/friend-periodicity.enum.js';
import { Friend } from '../friends/entities/friend.entity.js';
import { User } from '../users/entities/user.entity.js';
import { NudgeStatus } from './entities/nudge-status.enum.js';
import { Nudge } from './entities/nudge.entity.js';

const intervals: Record<FriendPeriodicity, string> = {
  WEEKLY: '7 days',
  BIWEEKLY: '14 days',
  MONTHLY: '1 month',
  QUARTERLY: '3 months',
};

@Injectable()
export class NudgeSchedulingService {
  /** Caller must hold the friend's row lock (or have just inserted it) in this transaction. */
  async plan(manager: EntityManager, friend: Friend): Promise<Nudge> {
    const user = await manager.findOneByOrFail(User, { id: friend.userId });
    const [result] = await manager.query<{ scheduledFor: Date }[]>(
      `SELECT (((($1::timestamptz AT TIME ZONE $2)::date + $3::interval)::date + $4::time) AT TIME ZONE $2) AS "scheduledFor"`,
      [
        friend.lastContactAt ?? friend.createdAt,
        user.timezone,
        intervals[friend.periodicity],
        user.preferredReminderLocalTime,
      ],
    );
    if (!result) throw new Error('Unable to calculate reminder time');

    const existing = await manager.findOne(Nudge, {
      where: { friendId: friend.id },
      lock: { mode: 'pessimistic_write' },
    });
    const nudge =
      existing ??
      manager.create(Nudge, { friendId: friend.id, userId: friend.userId, revision: 0 });
    nudge.scheduledFor = result.scheduledFor;
    nudge.status = NudgeStatus.PLANNED;
    nudge.revision += 1;
    return manager.save(Nudge, nudge);
  }

  /** Contact happened now: store it and plan the next reminder from it. Caller holds the friend lock. */
  async recordContact(manager: EntityManager, friend: Friend): Promise<Nudge> {
    friend.lastContactAt = new Date();
    await manager.save(Friend, friend);
    return this.plan(manager, friend);
  }

  /** Invalidate queued jobs when enabled changes without discarding a snoozed schedule. */
  async invalidate(manager: EntityManager, friend: Friend): Promise<void> {
    const nudge = await manager.findOne(Nudge, {
      where: { friendId: friend.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!nudge) {
      await this.plan(manager, friend);
      return;
    }
    nudge.revision += 1;
    await manager.save(Nudge, nudge);
  }
}
