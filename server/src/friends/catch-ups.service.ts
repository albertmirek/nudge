import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatchUp } from './entities/catch-up.entity.js';
import { ownedFriend } from './friend-access.js';

/**
 * Catch-ups are the user's notes about a friend (what they last talked about). They are
 * independent of contact history: only nudge confirmation records contact and reschedules.
 */
@Injectable()
export class CatchUpsService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async create(userId: string, friendId: string, note: string): Promise<CatchUp> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    return this.dataSource
      .getRepository(CatchUp)
      .save(this.dataSource.manager.create(CatchUp, { friendId, note }));
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
    note: string,
  ): Promise<CatchUp> {
    const catchUp = await this.get(userId, friendId, catchUpId);
    catchUp.note = note;
    return this.dataSource.getRepository(CatchUp).save(catchUp);
  }

  async delete(userId: string, friendId: string, catchUpId: string): Promise<void> {
    await ownedFriend(this.dataSource.manager, userId, friendId);
    const result = await this.dataSource.getRepository(CatchUp).delete({ id: catchUpId, friendId });
    if (!result.affected) throw new NotFoundException('Catch-up not found');
  }
}
