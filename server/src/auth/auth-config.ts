import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export type AuthConfig = {
  jwtSecret: Uint8Array;
  accessTokenTtlSeconds: number;
  /** Sliding idle window: a refresh pushes the session's expiry this far into the future. */
  refreshIdleDays: number;
  /** Absolute cap measured from the first sign-in of the session. */
  refreshMaxDays: number;
};

const DEV_SECRET = 'nudge-dev-only-secret-do-not-use-in-production';
const MIN_SECRET_LENGTH = 32;

function days(config: ConfigService, key: string, fallback: number): number {
  const raw = config.get<string>(key);
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${key} must be a positive number`);
  return value;
}

export function loadAuthConfig(config: ConfigService): AuthConfig {
  let secret = config.get<string>('AUTH_JWT_SECRET') ?? '';
  if (secret.length < MIN_SECRET_LENGTH) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`AUTH_JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
    }
    new Logger('Auth').warn('AUTH_JWT_SECRET missing or short; using the fixed dev secret');
    secret = DEV_SECRET;
  }
  return {
    jwtSecret: new TextEncoder().encode(secret),
    accessTokenTtlSeconds: 15 * 60,
    refreshIdleDays: days(config, 'AUTH_REFRESH_IDLE_DAYS', 180),
    refreshMaxDays: days(config, 'AUTH_REFRESH_MAX_DAYS', 730),
  };
}
