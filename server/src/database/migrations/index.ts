import type { MigrationInterface, MixedList } from 'typeorm';
import { InitialSchema1789376400000 } from './1789376400000-InitialSchema.js';
import { ReusableNudge1789380000000 } from './1789380000000-ReusableNudge.js';
import { UserName1789414404694 } from './1789414404694-UserName.js';
import { FriendProfile1789500000000 } from './1789500000000-FriendProfile.js';
import { AuthCredentials1790000000000 } from './1790000000000-AuthCredentials.js';

// Register every migration class here; the TypeORM CLI and the test global setup read this list.
export const migrations: MixedList<new () => MigrationInterface> = [
  InitialSchema1789376400000,
  ReusableNudge1789380000000,
  UserName1789414404694,
  FriendProfile1789500000000,
  AuthCredentials1790000000000,
];
