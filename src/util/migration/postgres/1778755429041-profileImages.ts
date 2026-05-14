import { MigrationInterface, QueryRunner } from "typeorm";

export class ProfileImages1778755429041 implements MigrationInterface {
	name = "ProfileImages1778755429041";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" ADD "avatar" character varying`);
		await queryRunner.query(`ALTER TABLE "users" ADD "banner" character varying`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "banner"`);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
	}
}
