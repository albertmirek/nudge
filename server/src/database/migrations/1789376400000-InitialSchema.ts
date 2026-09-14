import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789376400000 implements MigrationInterface {
  name = 'InitialSchema1789376400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "timezone" text NOT NULL, "preferred_reminder_local_time" TIME NOT NULL DEFAULT '18:00:00', "nudge_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."nudges_status_enum" AS ENUM('PLANNED', 'SNOOZED', 'SENT', 'CONFIRMED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "nudges" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "friend_id" uuid NOT NULL, "scheduled_for" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."nudges_status_enum" NOT NULL DEFAULT 'PLANNED', CONSTRAINT "nudges_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "nudges_friend_id_idx" ON "nudges"  ("friend_id") `);
    await queryRunner.query(
      `CREATE INDEX "nudges_user_id_status_scheduled_for_idx" ON "nudges"  ("user_id", "status", "scheduled_for") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."channels_type_enum" AS ENUM('WHATSAPP', 'TELEGRAM', 'SIGNAL', 'IMESSAGE', 'SMS', 'PHONE', 'EMAIL', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "channels" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "friend_id" uuid NOT NULL, "type" "public"."channels_type_enum" NOT NULL, "deep_link" text NOT NULL, CONSTRAINT "channels_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "channels_friend_id_idx" ON "channels"  ("friend_id") `);
    await queryRunner.query(
      `CREATE TYPE "public"."friends_periodicity_enum" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "friends" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "name" text NOT NULL, "periodicity" "public"."friends_periodicity_enum" NOT NULL, "last_contact_at" TIMESTAMP WITH TIME ZONE, "nudge_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "friends_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "friends_user_id_idx" ON "friends"  ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "catch_ups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "friend_id" uuid NOT NULL, "note" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "catch_ups_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "catch_ups_friend_id_created_at_idx" ON "catch_ups"  ("friend_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "nudges" ADD CONSTRAINT "nudges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nudges" ADD CONSTRAINT "nudges_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "channels" ADD CONSTRAINT "channels_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "catch_ups" ADD CONSTRAINT "catch_ups_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friends"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "catch_ups" DROP CONSTRAINT "catch_ups_friend_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "friends" DROP CONSTRAINT "friends_user_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "channels" DROP CONSTRAINT "channels_friend_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "nudges" DROP CONSTRAINT "nudges_friend_id_fkey"`);
    await queryRunner.query(`ALTER TABLE "nudges" DROP CONSTRAINT "nudges_user_id_fkey"`);
    await queryRunner.query(`DROP INDEX "public"."catch_ups_friend_id_created_at_idx"`);
    await queryRunner.query(`DROP TABLE "catch_ups"`);
    await queryRunner.query(`DROP INDEX "public"."friends_user_id_idx"`);
    await queryRunner.query(`DROP TABLE "friends"`);
    await queryRunner.query(`DROP TYPE "public"."friends_periodicity_enum"`);
    await queryRunner.query(`DROP INDEX "public"."channels_friend_id_idx"`);
    await queryRunner.query(`DROP TABLE "channels"`);
    await queryRunner.query(`DROP TYPE "public"."channels_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."nudges_user_id_status_scheduled_for_idx"`);
    await queryRunner.query(`DROP INDEX "public"."nudges_friend_id_idx"`);
    await queryRunner.query(`DROP TABLE "nudges"`);
    await queryRunner.query(`DROP TYPE "public"."nudges_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
