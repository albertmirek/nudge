import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthCredentials1790000000000 implements MigrationInterface {
  name = 'AuthCredentials1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing rows (the seeded dev user) get a placeholder so NOT NULL can be added; the seed
    // overwrites it and no production data exists yet.
    await queryRunner.query(`ALTER TABLE "users" ADD "email" text`);
    await queryRunner.query(
      `UPDATE "users" SET "email" = 'legacy-' || "id"::text || '@invalid.local' WHERE "email" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "email_verified_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "password_hash" text`);

    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"), CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE ("token_hash"), CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id")`,
    );

    await queryRunner.query(
      `CREATE TYPE "email_code_purpose" AS ENUM('VERIFY_EMAIL', 'RESET_PASSWORD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "purpose" "email_code_purpose" NOT NULL, "code_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT 0, "consumed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "email_codes_pkey" PRIMARY KEY ("id"), CONSTRAINT "email_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "email_codes_user_id_purpose_idx" ON "email_codes" ("user_id", "purpose")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_codes"`);
    await queryRunner.query(`DROP TYPE "email_code_purpose"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "users_email_key"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
  }
}
