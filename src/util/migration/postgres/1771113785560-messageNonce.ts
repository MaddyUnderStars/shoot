import type { MigrationInterface, QueryRunner } from "typeorm";

export class MessageNonce1771113785560 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "messages" ADD COLUMN "nonce" uuid DEFAULT NULL`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "nonce"`);
	}
}
