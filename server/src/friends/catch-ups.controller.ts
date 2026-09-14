import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserGuard, CurrentUserId } from '../common/current-user.js';
import { noteInput } from '../common/input.js';
import { CatchUpsService } from './catch-ups.service.js';

@Controller('v1/friends/:friendId/catch-up')
@UseGuards(CurrentUserGuard)
export class CatchUpsController {
  constructor(@Inject(CatchUpsService) private readonly catchUps: CatchUpsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Body() body: unknown,
  ) {
    return this.catchUps.create(userId, friendId, noteInput(body ?? {}, false).note ?? null);
  }

  @Get()
  list(@CurrentUserId() userId: string, @Param('friendId', ParseUUIDPipe) friendId: string) {
    return this.catchUps.list(userId, friendId);
  }

  @Get(':catchUpId')
  get(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('catchUpId', ParseUUIDPipe) catchUpId: string,
  ) {
    return this.catchUps.get(userId, friendId, catchUpId);
  }

  @Patch(':catchUpId')
  update(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('catchUpId', ParseUUIDPipe) catchUpId: string,
    @Body() body: unknown,
  ) {
    return this.catchUps.update(userId, friendId, catchUpId, noteInput(body, true).note ?? null);
  }

  @Delete(':catchUpId')
  @HttpCode(204)
  delete(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('catchUpId', ParseUUIDPipe) catchUpId: string,
  ) {
    return this.catchUps.delete(userId, friendId, catchUpId);
  }
}
