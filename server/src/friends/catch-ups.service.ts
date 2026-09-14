import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NudgeSchedulingService } from '../nudges/nudge-scheduling.service.js';
import { CatchUp } from './entities/catch-up.entity.js';
import { Friend } from './entities/friend.entity.js';
import { ownedFriend } from './friend-access.js';
import { recordCatchUp } from './record-catch-up.js';

@Injectable()
export class CatchUpsService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(NudgeSchedulingService) private readonly scheduling: NudgeSchedulingService,
  ) {}

  async create(userId: string, friendId: string, note: string | null): Promise<CatchUp> {
    return this.dataSource.transaction(async (manager) => {
      const friend = await ownedFriend(manager, userId, friendId, true);
      const catchUp = await recordCatchUp(manager, friend, note);
      await this.scheduling.plan(manager, friend);
      return catchUp;
    });
  }

  async list(userId: string, friendId: string): Promise<CatchUp[]> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    return this.dataSource
      .getRepository(CatchUp)
      .find({ where: { friendId }, order: { createdAt: 'DESC', id: 'DESC' } });
  }

  async get(userId: string, friendId: string, catchUpId: string): Promise<CatchUp> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    const catchUp = await this.dataSource
      .getRepository(CatchUp)
      .findOneBy({ id: catchUpId, friendId });
    if (!catchUp) throw new NotFoundException('Catch-up not found');
    return catchUp;
  }

  async update(
    userId: string,
    friendId: string,
    catchUpId: string,
    note: string | null,
  ): Promise<CatchUp> {
    return this.dataSource.transaction(async (manager) => {
      await ownedFriend(manager, userId, friendId, true);
      const catchUp = await manager.findOneBy(CatchUp, { id: catchUpId, friendId });
      if (!catchUp) throw new NotFoundException('Catch-up not found');
      catchUp.note = note;
      return manager.save(CatchUp, catchUp);
    });
  }

  async delete(userId: string, friendId: string, catchUpId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const friend = await ownedFriend(manager, userId, friendId, true);
      const result = await manager.delete(CatchUp, { id: catchUpId, friendId });
      if (!result.affected) throw new NotFoundException('Catch-up not found');
      const latest = await manager.findOne(CatchUp, {
        where: { friendId },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
      const lastContactAt = latest?.createdAt ?? null;
      // Removing an older note must not cancel a snooze or change the current schedule.
      if (friend.lastContactAt?.getTime() !== lastContactAt?.getTime()) {
        friend.lastContactAt = lastContactAt;
        await manager.save(Friend, friend);
        await this.scheduling.plan(manager, friend);
      }
    });
  }
}
