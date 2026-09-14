import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nudge } from './entities/nudge.entity.js';
import { NudgeSchedulingService } from './nudge-scheduling.service.js';
import { NudgesService } from './nudges.service.js';
import { NudgesController } from './nudges.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Nudge])],
  controllers: [NudgesController],
  providers: [NudgeSchedulingService, NudgesService],
  exports: [TypeOrmModule, NudgeSchedulingService, NudgesService],
})
export class NudgesModule {}
