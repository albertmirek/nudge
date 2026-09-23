import type { Request, Response } from 'express';
import { signAccessToken } from './access-token.js';
import type { AuthConfig } from './auth-config.js';
import { AuthMiddleware } from './auth.middleware.js';
import type { AuthenticatedRequest } from '../common/current-user.js';

const config: AuthConfig = {
  jwtSecret: new TextEncoder().encode('0123456789abcdef0123456789abcdef'),
  accessTokenTtlSeconds: 900,
  refreshIdleDays: 180,
  refreshMaxDays: 730,
};
const USER = '11111111-1111-1111-1111-111111111111';

function run(authorization?: string): Promise<AuthenticatedRequest> {
  const request = {
    header: (name: string) => (name === 'authorization' ? authorization : undefined),
  };
  return new Promise((resolve) => {
    new AuthMiddleware(config).use(request as unknown as Request, {} as Response, () =>
      resolve(request as unknown as AuthenticatedRequest),
    );
  });
}

describe('AuthMiddleware', () => {
  it('sets request.user from a valid bearer token', async () => {
    const token = await signAccessToken(config, USER);
    expect((await run(`Bearer ${token}`)).user).toEqual({ id: USER });
  });

  it.each([undefined, 'Basic abc', 'Bearer', 'Bearer not-a-jwt'])(
    'leaves request.user unset for %s',
    async (header) => {
      expect((await run(header)).user).toBeUndefined();
    },
  );

  it('ignores the legacy x-user-id header', async () => {
    const request = { header: (name: string) => (name === 'x-user-id' ? USER : undefined) };
    await new Promise<void>((resolve) => {
      new AuthMiddleware(config).use(request as unknown as Request, {} as Response, () =>
        resolve(),
      );
    });
    expect((request as unknown as AuthenticatedRequest).user).toBeUndefined();
  });
});
