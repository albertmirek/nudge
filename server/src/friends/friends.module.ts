import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatchUp } from './entities/catch-up.entity.js';
import { Channel } from './entities/channel.entity.js';
import { Friend } from './entities/friend.entity.js';
import { NudgesModule } from '../nudges/nudges.module.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';
import { CatchUpsController } from './catch-ups.controller.js';
import { CatchUpsService } from './catch-ups.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, Channel, CatchUp]), NudgesModule],
  controllers: [FriendsController, CatchUpsController],
  providers: [FriendsService, CatchUpsService],
  exports: [TypeOrmModule, FriendsService, CatchUpsService],
})
export class FriendsModule {}
