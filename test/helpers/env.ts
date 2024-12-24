import type { TestFn } from "ava";
import Sinon from "sinon";
import { proxyConfig } from "./config";
import { connectToRandomDb, deleteDatabase } from "./database";

export const setupTests = (test: TestFn) => {
	proxyConfig();
	test.before("setup", async (t) => {
		//@ts-ignore
		t.context.clock = Sinon.useFakeTimers({
			now: new Date(2024, 1, 1),
			shouldClearNativeTimers: true,
			shouldAdvanceTime: true,
		});

		global.console.log = () => {};
		// biome-ignore lint/performance/noDelete: <explanation>
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

		//@ts-ignore
		await t.context.clock.runAllAsync();
		//@ts-ignore
		await t.context.clock.restore();

		const { closeDatabase } = await import("../../src/util/database");
		closeDatabase();

		await deleteDatabase(
			"postgres://postgres:postgres@127.0.0.1/",
			//@ts-ignore
			t.context.database_name,
		);
	});
};
