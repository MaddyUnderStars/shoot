import type { MigrationInterface, QueryRunner } from "typeorm";

export class UserSettings1759544678980 implements MigrationInterface {
    name = 'UserSettings1759544678980'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_channel_settings_notifications_enum" AS ENUM('0', '1', '2')`);
        await queryRunner.query(`CREATE TABLE "user_channel_settings" ("channelId" uuid NOT NULL, "userSettingsUserId" character varying NOT NULL, "notifications" "public"."user_channel_settings_notifications_enum" NOT NULL, "muted_until" TIMESTAMP, CONSTRAINT "PK_e97bf0265fb0bad6813cfbc9dca" PRIMARY KEY ("channelId", "userSettingsUserId"))`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("userId" character varying NOT NULL, CONSTRAINT "PK_986a2b6d3c05eb4091bb8066f78" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "settingsUserId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_79dbb1fba3d3b8c9e5c960702ca" UNIQUE ("settingsUserId")`);
        await queryRunner.query(`ALTER TABLE "user_channel_settings" ADD CONSTRAINT "FK_9d32d0425d0437f390900ddfeda" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_channel_settings" ADD CONSTRAINT "FK_755fb4477665bbd57be1c5af521" FOREIGN KEY ("userSettingsUserId") REFERENCES "user_settings"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_79dbb1fba3d3b8c9e5c960702ca" FOREIGN KEY ("settingsUserId") REFERENCES "user_settings"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_79dbb1fba3d3b8c9e5c960702ca"`);
        await queryRunner.query(`ALTER TABLE "user_channel_settings" DROP CONSTRAINT "FK_755fb4477665bbd57be1c5af521"`);
        await queryRunner.query(`ALTER TABLE "user_channel_settings" DROP CONSTRAINT "FK_9d32d0425d0437f390900ddfeda"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_79dbb1fba3d3b8c9e5c960702ca"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "settingsUserId"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP TABLE "user_channel_settings"`);
        await queryRunner.query(`DROP TYPE "public"."user_channel_settings_notifications_enum"`);
    }

}
