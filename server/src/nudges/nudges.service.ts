import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ownedFriend } from '../friends/friend-access.js';
import { NudgeStatus } from './entities/nudge-status.enum.js';
import { Nudge } from './entities/nudge.entity.js';
import { NudgeSchedulingService } from './nudge-scheduling.service.js';

@Injectable()
export class NudgesService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(NudgeSchedulingService) private readonly scheduling: NudgeSchedulingService,
  ) {}

  snooze(userId: string, nudgeId: string, revision: number): Promise<Nudge> {
    return this.change(userId, nudgeId, revision, 'snooze');
  }

  confirm(userId: string, nudgeId: string, revision: number): Promise<Nudge> {
    return this.change(userId, nudgeId, revision, 'confirm');
  }

  private async change(
    userId: string,
    nudgeId: string,
    revision: number,
    action: 'snooze' | 'confirm',
  ): Promise<Nudge> {
    return this.dataSource.transaction(async (manager) => {
      const reference = await manager.findOneBy(Nudge, { id: nudgeId, userId });
      if (!reference) throw new NotFoundException('Nudge not found');
      const friend = await ownedFriend(manager, userId, reference.friendId, true);
      const nudge = await manager.findOne(Nudge, {
        where: { id: nudgeId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!nudge) throw new NotFoundException('Nudge not found');
      if (nudge.revision !== revision)
        throw new ConflictException('Nudge changed; reload the friend before retrying');

      if (action === 'confirm') {
        // Contact is recorded here or by opening a channel; catch-ups never affect it.
        return this.scheduling.recordContact(manager, friend);
      }

      nudge.status = NudgeStatus.SNOOZED;
      nudge.scheduledFor = new Date(nudge.scheduledFor.getTime() + 24 * 60 * 60 * 1000);
      nudge.revision += 1;
      return manager.save(Nudge, nudge);
    });
  }
}
