import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FriendProfile1789500000000 implements MigrationInterface {
  name = 'FriendProfile1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "friends" ADD "met_at" text, ADD "lives_in" text, ADD "birthday" date, ADD "notes" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "friends" DROP COLUMN "notes", DROP COLUMN "birthday", DROP COLUMN "lives_in", DROP COLUMN "met_at"`,
    );
  }
}
