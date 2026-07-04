import { describe } from "vitest";
import { test } from "../fixture";

describe("Migrations", { concurrent: false }, () => {
	test("Can rollback migrations from initial sync", async () => {
		const { getDatabase, initDatabase } = await import("../../src/util/database");

		await initDatabase();

		const db = getDatabase();
		const qr = db.createQueryRunner();
		const migrations = db.migrations;

		for (const migration of migrations.toReversed()) {
			await migration.down(qr);
		}
	});

	test("Can apply migrations", async () => {
		const { getDatabase } = await import("../../src/util/database");

		const db = getDatabase();
		const qr = db.createQueryRunner();
		const migrations = db.migrations;

		for (const migration of migrations) {
			await migration.up(qr);
		}
	});
});
