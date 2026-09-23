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
