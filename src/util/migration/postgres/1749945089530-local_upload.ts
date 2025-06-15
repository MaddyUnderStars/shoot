import {
	Table,
	TableForeignKey,
	type MigrationInterface,
	type QueryRunner,
} from "typeorm";

export class LocalUpload1749945089530 implements MigrationInterface {
	name = "LocalUpload";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: "local_uploads",
				columns: [
					{
						name: "id",
						type: "uuid",
						isPrimary: true,
					},
					{
						name: "hash",
						type: "varchar",
					},
					{
						name: "size",
						type: "int4",
					},
					{
						name: "mime",
						type: "varchar",
					},
					{
						name: "md5",
						type: "varchar",
					},
					{
						name: "width",
						type: "int4",
						isNullable: true,
					},
					{
						name: "height",
						type: "int4",
						isNullable: true,
					},
					{
						name: "channelId",
						type: "uuid",
						isNullable: true,
					},
				],
			}),
		);

		await queryRunner.createForeignKey(
			"local_uploads",
			new TableForeignKey({
				columnNames: ["channelId"],
				referencedColumnNames: ["id"],
				referencedTableName: "channels",
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable("local_uploads");
	}
}
