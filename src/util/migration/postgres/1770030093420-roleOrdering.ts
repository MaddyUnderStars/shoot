import type { MigrationInterface, QueryRunner } from "typeorm";

export class roleOrdering1770030093420 implements MigrationInterface {
	name = "roleOrdering1770030093420";

	public async up(queryRunner: QueryRunner): Promise<void> {
		const roles = await queryRunner.getTable("roles");

		if (!roles) throw new Error("failed to find roles table?");

		const position = roles.findColumnByName("position");
		if (!position) throw new Error("failed to find position column?");

		const positionIdx = roles.findColumnIndices(position);

		if (!positionIdx.length)
			throw new Error("failed to find (position, guildId) index?");

		await queryRunner.dropIndex(roles, positionIdx[0]);

		await queryRunner.query(
			`alter table roles add constraint role_ordering unique (position, "guildId") deferrable initially deferred;`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			"alter table roles drop constraint role_ordering;",
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "role_position" ON "roles" ("position", "guildId");`,
		);
	}
}
