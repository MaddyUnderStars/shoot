import type { MigrationInterface, QueryRunner } from "typeorm";

export class VoiceState1778143207892 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "voice_state" ("userId" uuid NOT NULL, "joined" TIMESTAMP WITH TIME ZONE NOT NULL, "channelId" uuid, CONSTRAINT "PK_74d65d75dd58f8ffcd87f392a48" PRIMARY KEY ("userId"))`,
		);

		await queryRunner.query(
			`ALTER TABLE "voice_state" ADD CONSTRAINT "FK_74d65d75dd58f8ffcd87f392a48" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`ALTER TABLE "voice_state" ADD CONSTRAINT "FK_f2479042534c9e412f85304d386" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "voice_state" DROP CONSTRAINT "FK_74d65d75dd58f8ffcd87f392a48"`,
		);
		await queryRunner.query(
			`ALTER TABLE "voice_state" DROP CONSTRAINT "FK_f2479042534c9e412f85304d386"`,
		);
		await queryRunner.query(`DROP TABLE "voice_state"`);
	}
}
