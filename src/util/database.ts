import type { DataSource } from "typeorm";
import { Migration } from "../entity/migrations";
import { config } from "./config";
import { getDatasource } from "./datasource";
import { createLogger } from "./log";

const Log = createLogger("database");

let connection: DataSource | null = null;
let initCalled: Promise<DataSource> | null = null;

export const initDatabase = async () => {
	if (connection) return connection;
	if (initCalled) return await initCalled;

	Log.msg(`Connecting to ${config().database.url}`);

	try {
		initCalled = getDatasource().initialize();
		connection = await initCalled;
	} catch (e) {
		Log.error(e instanceof Error ? e.message : e);
		process.exit(1);
	}
	await doFirstSync();

	Log.msg("Connected");

	return connection;
};

export const getDatabase = () => {
	if (!connection) throw Error("Tried accessing database before connecting");
	return connection;
};

export const closeDatabase = () => {
	connection?.destroy();
	connection = null;
	initCalled = null;
};

const doFirstSync = async () => {
	if (!connection) return; // not possible

	if (!(await dbExists())) {
		Log.msg("This appears to be a fresh database. Synchronising.");
		await connection.synchronize();

		// On next start, typeorm will try to run all the migrations again from beginning.
		// Manually insert every current migration to prevent this:
		await Promise.all(
			connection.migrations.map((migration) =>
				Migration.insert({
					name: migration.name,
					timestamp: Date.now(),
				}),
			),
		);
	} else {
		Log.msg("Applying missing migrations, if any.");
		await connection.runMigrations();
	}
};

const dbExists = async () => {
	try {
		await Migration.count();
		return true;
	} catch (_) {
		return false;
	}
};
