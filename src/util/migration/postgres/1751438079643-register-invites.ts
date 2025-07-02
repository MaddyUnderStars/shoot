import type { MigrationInterface, QueryRunner } from "typeorm";

export class RegisterInvites1751438079643 implements MigrationInterface {
	name = "RegisterInvites1751438079643";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "instance_invites" ("code" character varying NOT NULL, "expires" TIMESTAMP, "maxUses" integer, CONSTRAINT "PK_bd613d455be90064ce6cbaea14e" PRIMARY KEY ("code"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "inviteCode" character varying`,
		);
		await queryRunner.query(
			`ALTER TABLE "users" ADD CONSTRAINT "FK_bbb81d30f7992d6cb1e328e7dd9" FOREIGN KEY ("inviteCode") REFERENCES "instance_invites"("code") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" DROP CONSTRAINT "FK_bbb81d30f7992d6cb1e328e7dd9"`,
		);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "inviteCode"`);
		await queryRunner.query(`DROP TABLE "instance_invites"`);
	}
}
