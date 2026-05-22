import { MigrationInterface, QueryRunner } from "typeorm";

export class EmbedThumbnails1779430645216 implements MigrationInterface {
	name = "EmbedThumbnails1779430645216";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "embeds" ADD "thumbnail" text NULL`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "embeds" DROP COLUMN "thumbnail"`);
	}
}
