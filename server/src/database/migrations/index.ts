import type { MigrationInterface, MixedList } from 'typeorm';
import { InitialSchema1789376400000 } from './1789376400000-InitialSchema.js';
import { ReusableNudge1789380000000 } from './1789380000000-ReusableNudge.js';

// Register every migration class here; the TypeORM CLI and the test global setup read this list.
export const migrations: MixedList<new () => MigrationInterface> = [
  InitialSchema1789376400000,
  ReusableNudge1789380000000,
];
