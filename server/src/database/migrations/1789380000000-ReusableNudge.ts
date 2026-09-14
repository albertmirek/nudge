import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReusableNudge1789380000000 implements MigrationInterface {
  name = 'ReusableNudge1789380000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Fail if legacy duplicates exist: choosing which reminder to retain requires a data decision.
    await queryRunner.query('DROP INDEX "nudges_friend_id_idx"');
    await queryRunner.query(
      'ALTER TABLE "nudges" ADD CONSTRAINT "nudges_friend_id_key" UNIQUE ("friend_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "nudges" ADD "revision" integer NOT NULL DEFAULT 1, ADD "last_edited_at" timestamptz NOT NULL DEFAULT now()',
    );
    await queryRunner.query(
      'CREATE INDEX "nudges_status_scheduled_for_idx" ON "nudges" ("status", "scheduled_for")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "nudges_status_scheduled_for_idx"');
    await queryRunner.query(
      'ALTER TABLE "nudges" DROP COLUMN "last_edited_at", DROP COLUMN "revision"',
    );
    await queryRunner.query('ALTER TABLE "nudges" DROP CONSTRAINT "nudges_friend_id_key"');
    await queryRunner.query('CREATE INDEX "nudges_friend_id_idx" ON "nudges" ("friend_id")');
  }
}
