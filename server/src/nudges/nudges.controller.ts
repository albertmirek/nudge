import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserGuard, CurrentUserId } from '../common/current-user.js';
import { revisionInput } from '../common/input.js';
import { NudgesService } from './nudges.service.js';

@Controller('v1/nudges')
@UseGuards(CurrentUserGuard)
export class NudgesController {
  constructor(@Inject(NudgesService) private readonly nudges: NudgesService) {}

  @Post(':nudgeId/snooze')
  @HttpCode(200)
  snooze(
    @CurrentUserId() userId: string,
    @Param('nudgeId', ParseUUIDPipe) nudgeId: string,
    @Body() body: unknown,
  ) {
    return this.nudges.snooze(userId, nudgeId, revisionInput(body));
  }

  @Post(':nudgeId/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUserId() userId: string,
    @Param('nudgeId', ParseUUIDPipe) nudgeId: string,
    @Body() body: unknown,
  ) {
    return this.nudges.confirm(userId, nudgeId, revisionInput(body));
  }
}
