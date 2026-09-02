import { MigrationInterface, QueryRunner } from "typeorm";

export class Oauth1788350631599 implements MigrationInterface {
	name = "Oauth1788350631599";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "oauth_clients" ("id" uuid NOT NULL, "name" character varying, "secret" character varying NOT NULL, "grants" text NOT NULL, "redirectUris" text NOT NULL, CONSTRAINT "PK_c4759172d3431bae6f04e678e0d" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "oauth_tokens" ("type" character varying NOT NULL, "value" character varying NOT NULL, "expires" TIMESTAMP, "redirectUri" character varying, "scopes" text NOT NULL, "codeChallenge" character varying, "codeChallengeMethod" character varying, "clientId" uuid, "userId" uuid, CONSTRAINT "PK_e3e33b4d37e971c656db04e82ca" PRIMARY KEY ("value"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "oauth_tokens" ADD CONSTRAINT "FK_3d9dfb37837e5dd891bbc81b324" FOREIGN KEY ("clientId") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "oauth_tokens" ADD CONSTRAINT "FK_a8c200cc4c90d24e832caf0a180" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "oauth_tokens" DROP CONSTRAINT "FK_a8c200cc4c90d24e832caf0a180"`,
		);
		await queryRunner.query(
			`ALTER TABLE "oauth_tokens" DROP CONSTRAINT "FK_3d9dfb37837e5dd891bbc81b324"`,
		);
		await queryRunner.query(`DROP TABLE "oauth_tokens"`);
		await queryRunner.query(`DROP TABLE "oauth_clients"`);
	}
}
