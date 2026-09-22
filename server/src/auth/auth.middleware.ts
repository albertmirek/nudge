import { Inject, Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../common/current-user.js';
import { verifyAccessToken } from './access-token.js';
import { AUTH_CONFIG, type AuthConfig } from './auth-config.js';

/**
 * Resolves `Authorization: Bearer <jwt>` into `request.user = { id }`. Never rejects: routes
 * decide whether they need a user via CurrentUserGuard, and the client treats the resulting
 * 401 as "refresh the access token and retry".
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const header = request.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (token) {
      const userId = await verifyAccessToken(this.config, token);
      if (userId) (request as AuthenticatedRequest).user = { id: userId };
    }
    next();
  }
}
