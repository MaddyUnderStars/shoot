import type { MigrationInterface, QueryRunner } from "typeorm";

export class UploadsCascade1757588526875 implements MigrationInterface {
	name = "UploadsCascade1757588526875";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "local_uploads" DROP CONSTRAINT "FK_d878b7ffbc96108478828734cd6"`,
		);
		await queryRunner.query(
			`ALTER TABLE "local_uploads" ADD CONSTRAINT "FK_d878b7ffbc96108478828734cd6" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "local_uploads" DROP CONSTRAINT "FK_d878b7ffbc96108478828734cd6"`,
		);
		await queryRunner.query(
			`ALTER TABLE "local_uploads" ADD CONSTRAINT "FK_d878b7ffbc96108478828734cd6" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
		);
	}
}
