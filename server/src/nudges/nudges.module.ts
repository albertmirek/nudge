import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nudge } from './entities/nudge.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Nudge])],
  exports: [TypeOrmModule],
})
export class NudgesModule {}
