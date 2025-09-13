import type { MigrationInterface, QueryRunner } from "typeorm";

export class InviteIndex1757745204938 implements MigrationInterface {
	name = "InviteIndex1757745204938";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_d93b870a3ddf61f5279dae3969" ON "invites" ("code", "guildId") `,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX "public"."IDX_d93b870a3ddf61f5279dae3969"`,
		);
	}
}
