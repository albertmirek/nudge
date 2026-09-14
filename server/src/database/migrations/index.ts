import type { MigrationInterface, MixedList } from 'typeorm';

// Register every migration class here; the TypeORM CLI and the test global setup read this list.
export const migrations: MixedList<new () => MigrationInterface> = [];
