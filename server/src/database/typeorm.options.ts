import type { DataSourceOptions } from 'typeorm';
import { EmailCode } from '../auth/entities/email-code.entity.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import { CatchUp } from '../friends/entities/catch-up.entity.js';
import { Channel } from '../friends/entities/channel.entity.js';
import { Friend } from '../friends/entities/friend.entity.js';
import { Nudge } from '../nudges/entities/nudge.entity.js';
import { User } from '../users/entities/user.entity.js';
import { migrations } from './migrations/index.js';

// Single source of truth for the TypeORM connection. Used by DatabaseModule (Nest runtime),
// data-source.ts (TypeORM CLI) and the e2e global setup, so they cannot drift apart.
// Entities are listed explicitly rather than globbed so the list works identically under
// tsx, vitest and compiled dist/ without a TypeScript loader.
export function buildDataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    uuidExtension: 'pgcrypto',
    entities: [User, Friend, Channel, CatchUp, Nudge, RefreshToken, EmailCode],
    migrations,
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
