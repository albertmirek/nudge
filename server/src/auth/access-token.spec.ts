import { decodeJwt } from 'jose';
import { signAccessToken, verifyAccessToken } from './access-token.js';
import type { AuthConfig } from './auth-config.js';

const config: AuthConfig = {
  jwtSecret: new TextEncoder().encode('0123456789abcdef0123456789abcdef'),
  accessTokenTtlSeconds: 900,
  refreshIdleDays: 180,
  refreshMaxDays: 730,
};
const USER = '11111111-1111-1111-1111-111111111111';

describe('access token', () => {
  it('signs a 15-minute token for the user and verifies it', async () => {
    const now = new Date();
    const token = await signAccessToken(config, USER, now);
    const claims = decodeJwt(token);
    expect(claims).toMatchObject({ sub: USER, iss: 'nudge', aud: 'nudge' });
    expect(claims.exp! - claims.iat!).toBe(900);
    await expect(verifyAccessToken(config, token)).resolves.toBe(USER);
  });

  it('rejects expired, tampered and foreign tokens', async () => {
    const old = await signAccessToken(config, USER, new Date(Date.now() - 20 * 60 * 1000));
    await expect(verifyAccessToken(config, old)).resolves.toBeNull();
    const token = await signAccessToken(config, USER);
    await expect(verifyAccessToken(config, token.slice(0, -3) + 'abc')).resolves.toBeNull();
    const other = {
      ...config,
      jwtSecret: new TextEncoder().encode('another-secret-another-secret-1'),
    };
    await expect(verifyAccessToken(other, token)).resolves.toBeNull();
    await expect(verifyAccessToken(config, 'not-a-jwt')).resolves.toBeNull();
  });
});
