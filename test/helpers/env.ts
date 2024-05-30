import { TestFn } from "ava";
import { proxyConfig } from "./config";
import { connectToRandomDb, deleteDatabase } from "./database";

export const setupTests = (test: TestFn) => {
	proxyConfig();
	test.before("setup", async (t) => {
		global.console.log = () => {};
		delete process.env.NODE_ENV;
		process.env.SUPPRESS_NO_CONFIG_WARNING = "1";
		const db = await connectToRandomDb(
			"postgres://postgres:postgres@127.0.0.1/",
		);
		process.env.NODE_ENV = "test";

		//@ts-ignore
		t.context.database_name = db;
		global.console.log = t.log;
	});

	test.after.always("teardown", async (t) => {
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
