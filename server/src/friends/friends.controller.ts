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
import { createFriendInput, updateFriendInput } from './friend-input.js';
import { FriendsService } from './friends.service.js';

@Controller('v1/friends')
@UseGuards(CurrentUserGuard)
export class FriendsController {
  constructor(@Inject(FriendsService) private readonly friends: FriendsService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.friends.create(userId, createFriendInput(body));
  }

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.friends.list(userId);
  }

  @Get(':friendId')
  get(@CurrentUserId() userId: string, @Param('friendId', ParseUUIDPipe) friendId: string) {
    return this.friends.get(userId, friendId);
  }

  @Patch(':friendId')
  update(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Body() body: unknown,
  ) {
    return this.friends.update(userId, friendId, updateFriendInput(body));
  }

  @Delete(':friendId')
  @HttpCode(204)
  delete(@CurrentUserId() userId: string, @Param('friendId', ParseUUIDPipe) friendId: string) {
    return this.friends.delete(userId, friendId);
  }
}
