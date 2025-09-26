import type { MigrationInterface, QueryRunner } from "typeorm";

export class PushSubscription1758865221251 implements MigrationInterface {
	name = "PushSubscription1758865221251";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "push_subscriptions" ("userId" uuid NOT NULL, "name" character varying NOT NULL, "endpoint" character varying NOT NULL, "p256dh" character varying NOT NULL, "auth" character varying NOT NULL, "created" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_267923180f80df311f801d88441" PRIMARY KEY ("userId", "name"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "push_subscriptions" ADD CONSTRAINT "FK_4cc061875e9eecc311a94b3e431" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "push_subscriptions" DROP CONSTRAINT "FK_4cc061875e9eecc311a94b3e431"`,
		);
		await queryRunner.query(`DROP TABLE "push_subscriptions"`);
	}
}
