import type { MigrationInterface, MixedList } from 'typeorm';
import { InitialSchema1789376400000 } from './1789376400000-InitialSchema.js';

// Register every migration class here; the TypeORM CLI and the test global setup read this list.
export const migrations: MixedList<new () => MigrationInterface> = [InitialSchema1789376400000];
