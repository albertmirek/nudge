import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Channels store a handle and derive their link; only OTHER keeps a user-supplied deep_link.
 * Nothing writes channels before this migration. If rows exist, adding the NOT NULL handle
 * fails on purpose rather than inventing handles.
 */
export class ChannelHandle1789600000000 implements MigrationInterface {
  name = 'ChannelHandle1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."channels_type_enum" ADD VALUE 'INSTAGRAM'`);
    await queryRunner.query(`ALTER TYPE "public"."channels_type_enum" ADD VALUE 'MESSENGER'`);
    await queryRunner.query(`ALTER TABLE "channels" ADD "handle" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "channels" ALTER COLUMN "deep_link" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "channels_friend_id_type_handle_key" UNIQUE ("friend_id", "type", "handle")`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "channels_deep_link_check" CHECK (("type" = 'OTHER') = ("deep_link" IS NOT NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "channels" DROP CONSTRAINT "channels_deep_link_check"`);
    await queryRunner.query(
      `ALTER TABLE "channels" DROP CONSTRAINT "channels_friend_id_type_handle_key"`,
    );
    // Reverting: the old enum and NOT NULL deep_link cannot represent these rows.
    await queryRunner.query(`DELETE FROM "channels" WHERE "type" IN ('INSTAGRAM', 'MESSENGER')`);
    await queryRunner.query(`UPDATE "channels" SET "deep_link" = '' WHERE "deep_link" IS NULL`);
    await queryRunner.query(`ALTER TABLE "channels" ALTER COLUMN "deep_link" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "channels" DROP COLUMN "handle"`);
    await queryRunner.query(
      `ALTER TYPE "public"."channels_type_enum" RENAME TO "channels_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."channels_type_enum" AS ENUM('WHATSAPP', 'TELEGRAM', 'SIGNAL', 'IMESSAGE', 'SMS', 'PHONE', 'EMAIL', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ALTER COLUMN "type" TYPE "public"."channels_type_enum" USING "type"::text::"public"."channels_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."channels_type_enum_old"`);
  }
}
