import { createParamDecorator, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedRequest {
  // Set by trusted authentication middleware after resolving the internal user UUID.
  user?: { id: string };
}

function userId(context: ExecutionContext): string {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (
    !user ||
    typeof user.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
  ) {
    throw new UnauthorizedException();
  }
  return user.id;
}

@Injectable()
export class CurrentUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    userId(context);
    return true;
  }
}

export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  userId(context),
);
