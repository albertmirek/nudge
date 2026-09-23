import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserGuard, CurrentUserId } from '../common/current-user.js';
import { createChannelInput, updateChannelInput } from './channel-rules.js';
import { ChannelsService } from './channels.service.js';

@Controller('v1/friends/:friendId/channels')
@UseGuards(CurrentUserGuard)
export class ChannelsController {
  constructor(@Inject(ChannelsService) private readonly channels: ChannelsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Body() body: unknown,
  ) {
    return this.channels.create(userId, friendId, createChannelInput(body));
  }

  @Patch(':channelId')
  update(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() body: unknown,
  ) {
    return this.channels.update(userId, friendId, channelId, updateChannelInput(body));
  }

  @Delete(':channelId')
  @HttpCode(204)
  delete(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.delete(userId, friendId, channelId);
  }

  @Post(':channelId/open')
  @HttpCode(200)
  open(
    @CurrentUserId() userId: string,
    @Param('friendId', ParseUUIDPipe) friendId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
  ) {
    return this.channels.open(userId, friendId, channelId);
  }
}
