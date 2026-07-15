import { MigrationInterface, QueryRunner } from "typeorm";

export class AttachmentTargets1784116728040 implements MigrationInterface {
	name = "AttachmentTargets1784116728040";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "local_uploads" ADD "userId" uuid`);
		await queryRunner.query(
			`ALTER TABLE "local_uploads" ADD CONSTRAINT "FK_02e0f41c030fb6680bfb34e2f1a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		console.warn(
			"\n\nWARNING: The storage paths have changed for both local and s3. Move all of the files in your storage to a 'channels' subdirectory.\n\n",
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "local_uploads" DROP CONSTRAINT "FK_02e0f41c030fb6680bfb34e2f1a"`,
		);
		await queryRunner.query(`ALTER TABLE "local_uploads" DROP COLUMN "userId"`);
	}
}
