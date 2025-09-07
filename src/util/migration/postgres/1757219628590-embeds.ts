import type { MigrationInterface, QueryRunner } from "typeorm";

export class Embeds1757219628590 implements MigrationInterface {
	name = "Embeds1757219628590";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "embeds" ("target" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "type" integer NOT NULL, "title" character varying, "description" character varying, "author_name" character varying, "author_url" character varying, "footer" character varying, "footer_icon" character varying, "provider_name" character varying, "provider_url" character varying, "images" text, "videos" text, CONSTRAINT "PK_7ea0a44ffa579ad9271f36e6847" PRIMARY KEY ("target"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "messages_embeds_embeds" ("messagesId" uuid NOT NULL, "embedsTarget" character varying NOT NULL, CONSTRAINT "PK_6e18c315ff8cf84108c3616a970" PRIMARY KEY ("messagesId", "embedsTarget"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_4ecd06cb6bbe71bf0bfc138dcb" ON "messages_embeds_embeds" ("messagesId") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_cbbe0ec3f729857ef44c372234" ON "messages_embeds_embeds" ("embedsTarget") `,
		);
		await queryRunner.query(
			`ALTER TABLE "messages_embeds_embeds" ADD CONSTRAINT "FK_4ecd06cb6bbe71bf0bfc138dcb7" FOREIGN KEY ("messagesId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
		await queryRunner.query(
			`ALTER TABLE "messages_embeds_embeds" ADD CONSTRAINT "FK_cbbe0ec3f729857ef44c3722344" FOREIGN KEY ("embedsTarget") REFERENCES "embeds"("target") ON DELETE CASCADE ON UPDATE CASCADE`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "messages_embeds_embeds" DROP CONSTRAINT "FK_cbbe0ec3f729857ef44c3722344"`,
		);
		await queryRunner.query(
			`ALTER TABLE "messages_embeds_embeds" DROP CONSTRAINT "FK_4ecd06cb6bbe71bf0bfc138dcb7"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_cbbe0ec3f729857ef44c372234"`,
		);
		await queryRunner.query(
			`DROP INDEX "public"."IDX_4ecd06cb6bbe71bf0bfc138dcb"`,
		);
		await queryRunner.query(`DROP TABLE "messages_embeds_embeds"`);
		await queryRunner.query(`DROP TABLE "embeds"`);
	}
}
