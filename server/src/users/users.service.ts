import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async getMe(userId: string): Promise<User> {
    const user = await this.dataSource.getRepository(User).findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
