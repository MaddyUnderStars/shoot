import { MigrationInterface, QueryRunner } from "typeorm";

export class AutojoinGuilds1783139862203 implements MigrationInterface {
	name = "AutojoinGuilds1783139862203";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "instance_invites" ADD "guildId" uuid`);
		await queryRunner.query(
			`ALTER TABLE "instance_invites" ADD CONSTRAINT "FK_7f58097871f2ebea793fe9211cc" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "instance_invites" DROP CONSTRAINT "FK_7f58097871f2ebea793fe9211cc"`,
		);
		await queryRunner.query(`ALTER TABLE "instance_invites" DROP COLUMN "guildId"`);
	}
}
