import type { MigrationInterface, QueryRunner } from "typeorm";

export class ChannelOrdering1750057984384 implements MigrationInterface {
	name = "ChannelOrdering1750057984384";

	public async up(queryRunner: QueryRunner): Promise<void> {
		const channels = await queryRunner.getTable("channels");

		if (!channels) throw new Error("failed to find channels table?");

		const position = channels.findColumnByName("position");
		if (!position) throw new Error("failed to find position column?");

		const positionIdx = channels.findColumnIndices(position);

		if (!positionIdx.length)
			throw new Error("failed to find (position, guildId) index?");

		await queryRunner.dropIndex(channels, positionIdx[0]);

		await queryRunner.query(
			`alter table channels add constraint channel_ordering unique (position, "guildId") deferrable initially deferred;`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			"alter table channels drop constraint channel_ordering;",
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "channel_position" ON "channels" ("position", "guildId")`,
		);
	}
}
