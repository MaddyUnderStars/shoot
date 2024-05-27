import { TestFn } from "ava";
import { proxyConfig } from "./config";
import { connectToRandomDb, deleteDatabase } from "./database";

export const setupTests = (test: TestFn) => {
	proxyConfig();
	test.beforeEach("setup", async (t) => {
		global.console.log = () => {};
		const db = await connectToRandomDb(
			"postgres://postgres:postgres@127.0.0.1/",
		);

		//@ts-ignore
		t.context.database_name = db;
	});

	test.afterEach("teardown", async (t) => {
		// delete temp db?

		const { closeDatabase } = await import("../../src/util");
		await closeDatabase();

		deleteDatabase(
			"postgres://postgres:postgres@127.0.0.1/",
			//@ts-ignore
			t.context.database_name,
		);
	});
};
