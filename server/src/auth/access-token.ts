import { SignJWT, jwtVerify } from 'jose';
import type { AuthConfig } from './auth-config.js';

const ISSUER = 'nudge';
const AUDIENCE = 'nudge';

export async function signAccessToken(
  config: AuthConfig,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + config.accessTokenTtlSeconds)
    .sign(config.jwtSecret);
}

/** The user id from a valid token, or null for anything else — never throws. */
export async function verifyAccessToken(config: AuthConfig, token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
