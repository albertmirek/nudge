import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatchUp } from './entities/catch-up.entity.js';
import { Channel } from './entities/channel.entity.js';
import { Friend } from './entities/friend.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, Channel, CatchUp])],
  exports: [TypeOrmModule],
})
export class FriendsModule {}
