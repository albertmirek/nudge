import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { CurrentUserGuard, CurrentUserId } from '../common/current-user.js';
import { UsersService } from './users.service.js';

@Controller('v1/users')
@UseGuards(CurrentUserGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUserId() userId: string) {
    return this.users.getMe(userId);
  }
}
