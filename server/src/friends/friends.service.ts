import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NudgeSchedulingService } from '../nudges/nudge-scheduling.service.js';
import { User } from '../users/entities/user.entity.js';
import { Friend } from './entities/friend.entity.js';
import { ownedFriend } from './friend-access.js';
import type { CreateFriendInput } from './friend-input.js';

@Injectable()
export class FriendsService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(NudgeSchedulingService) private readonly scheduling: NudgeSchedulingService,
  ) {}

  async create(userId: string, input: CreateFriendInput): Promise<Friend> {
    return this.dataSource.transaction(async (manager) => {
      if (!(await manager.existsBy(User, { id: userId })))
        throw new NotFoundException('User not found');
      const friend = await manager.save(
        Friend,
        manager.create(Friend, { ...input, userId, lastContactAt: null }),
      );
      friend.nudge = await this.scheduling.plan(manager, friend);
      return friend;
    });
  }

  list(userId: string): Promise<Friend[]> {
    return this.dataSource.getRepository(Friend).find({
      where: { userId },
      relations: { nudge: true, channels: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  async get(userId: string, friendId: string): Promise<Friend> {
    const friend = await this.dataSource
      .getRepository(Friend)
      .findOne({ where: { id: friendId, userId }, relations: { nudge: true, channels: true } });
    if (!friend) throw new NotFoundException('Friend not found');
    return friend;
  }

  async update(
    userId: string,
    friendId: string,
    input: Partial<CreateFriendInput>,
  ): Promise<Friend> {
    return this.dataSource.transaction(async (manager) => {
      const friend = await ownedFriend(manager, userId, friendId, true);
      const periodicityChanged =
        input.periodicity !== undefined && input.periodicity !== friend.periodicity;
      const enabledChanged =
        input.nudgeEnabled !== undefined && input.nudgeEnabled !== friend.nudgeEnabled;
      Object.assign(friend, input);
      await manager.save(Friend, friend);
      if (periodicityChanged) await this.scheduling.plan(manager, friend);
      else if (enabledChanged) await this.scheduling.invalidate(manager, friend);
      return manager.findOneOrFail(Friend, {
        where: { id: friendId },
        relations: { nudge: true, channels: true },
      });
    });
  }

  async delete(userId: string, friendId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await ownedFriend(manager, userId, friendId, true);
      await manager.delete(Friend, { id: friendId });
    });
  }
}
