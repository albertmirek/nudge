import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, type EntityManager } from 'typeorm';
import { AUTH_CONFIG, type AuthConfig } from './auth-config.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Opaque, single-use, sliding refresh tokens. Callers own the transaction. */
@Injectable()
export class RefreshTokensService {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  async issue(manager: EntityManager, userId: string, now = new Date()): Promise<string> {
    return this.insert(manager, userId, now, now);
  }

  /**
   * Swaps a valid token for a new one. Returns null when the token is unknown, expired, past the
   * absolute cap, or already revoked — in the last case every session of that user is revoked,
   * because a replayed token means it leaked.
   */
  async rotate(
    manager: EntityManager,
    token: string,
    now = new Date(),
  ): Promise<{ userId: string; token: string } | null> {
    const row = await manager.findOneBy(RefreshToken, { tokenHash: hashToken(token) });
    if (!row) return null;
    if (row.revokedAt) {
      await this.revokeAllForUser(manager, row.userId, now);
      return null;
    }
    const cap = row.createdAt.getTime() + this.config.refreshMaxDays * DAY_MS;
    if (row.expiresAt.getTime() <= now.getTime() || cap <= now.getTime()) return null;

    await manager.update(RefreshToken, { id: row.id }, { revokedAt: now });
    const next = await this.insert(manager, row.userId, row.createdAt, now);
    return { userId: row.userId, token: next };
  }

  async revoke(manager: EntityManager, token: string, now = new Date()): Promise<void> {
    await manager.update(
      RefreshToken,
      { tokenHash: hashToken(token), revokedAt: IsNull() },
      { revokedAt: now },
    );
  }

  async revokeAllForUser(manager: EntityManager, userId: string, now = new Date()): Promise<void> {
    await manager.update(RefreshToken, { userId, revokedAt: IsNull() }, { revokedAt: now });
  }

  private async insert(
    manager: EntityManager,
    userId: string,
    createdAt: Date,
    now: Date,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await manager.insert(RefreshToken, {
      userId,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt: new Date(now.getTime() + this.config.refreshIdleDays * DAY_MS),
      revokedAt: null,
    });
    return token;
  }
}
