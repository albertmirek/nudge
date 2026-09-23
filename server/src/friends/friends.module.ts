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
import { ChannelsController } from './channels.controller.js';
import { ChannelsService } from './channels.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, Channel, CatchUp]), NudgesModule],
  controllers: [FriendsController, CatchUpsController, ChannelsController],
  providers: [FriendsService, CatchUpsService, ChannelsService],
  exports: [TypeOrmModule, FriendsService, CatchUpsService],
})
export class FriendsModule {}
