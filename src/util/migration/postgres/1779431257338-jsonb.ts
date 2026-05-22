import { MigrationInterface, QueryRunner } from "typeorm";

export class Jsonb1779431257338 implements MigrationInterface {
	name = "Jsonb1779431257338";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "activitypub_objects" ALTER COLUMN "raw" TYPE jsonb USING raw::jsonb::jsonb`,
		);

		await queryRunner.query(
			`ALTER TABLE "channels" ALTER COLUMN "collections" TYPE jsonb USING collections::jsonb::jsonb`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "collections" TYPE jsonb USING collections::jsonb::jsonb`,
		);
		await queryRunner.query(
			`ALTER TABLE "guilds" ALTER COLUMN "collections" TYPE jsonb USING collections::jsonb::jsonb`,
		);

		await queryRunner.query(
			`ALTER TABLE "embeds" ALTER COLUMN "images" TYPE jsonb USING images::jsonb::jsonb`,
		);
		await queryRunner.query(
			`ALTER TABLE "embeds" ALTER COLUMN "videos" TYPE jsonb USING videos::jsonb::jsonb`,
		);
		await queryRunner.query(
			`ALTER TABLE "embeds" ALTER COLUMN "thumbnail" TYPE jsonb USING thumbnail::jsonb::jsonb`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "activitypub_objects" ALTER COLUMN "raw" TYPE text USING raw::text`,
		);

		await queryRunner.query(
			`ALTER TABLE "channels" ALTER COLUMN "collections" TYPE text USING collections::text`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "collections" TYPE text USING collections::text`,
		);
		await queryRunner.query(
			`ALTER TABLE "guilds" ALTER COLUMN "collections" TYPE text USING collections::text`,
		);

		await queryRunner.query(
			`ALTER TABLE "embeds" ALTER COLUMN "images" TYPE text USING images::text`,
		);
		await queryRunner.query(
			`ALTER TABLE "embeds" ALTER COLUMN "videos" TYPE text USING videos::text`,
		);
		await queryRunner.query(
			`ALTER TABLE "embeds" ALTER COLUMN "thumbnail" TYPE text USING thumbnail::text`,
		);
	}
}
