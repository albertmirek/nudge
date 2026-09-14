import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from './current-user.js';

/**
 * Dev-only stand-in for the trusted authentication layer that doesn't exist yet.
 * Trusts an `x-user-id` header and copies it onto `request.user`, exactly like
 * `createTestApp` does for e2e tests. Never wired up when NODE_ENV=production
 * (see main.ts) — production must never accept identity from a request header.
 */
export function devAuthMiddleware(request: Request, _response: Response, next: NextFunction) {
  const header = request.header('x-user-id');
  if (typeof header === 'string' && header) {
    (request as AuthenticatedRequest).user = { id: header };
  }
  next();
}
