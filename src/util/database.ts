import path from "path";
import { DataSource } from "typeorm";
import { Migration } from "../entity/migrations";
import { config } from "./config";
import { createLogger } from "./log";

const Log = createLogger("database");

const CONNECTION_STRING = config.database.url;
const CONNECTION_TYPE = CONNECTION_STRING.split("://")?.[0]?.replace(
	"+src",
	"",
);
const IS_SQLITE = CONNECTION_TYPE == "sqlite";

const DATASOURCE_OPTIONS = new DataSource({
	//@ts-ignore
	type: CONNECTION_TYPE,
	url: IS_SQLITE ? undefined : CONNECTION_STRING,
	database: IS_SQLITE ? CONNECTION_STRING.split("://")[1] : undefined,
	entities: [path.join(__dirname, "..", "entity", "*.js")],
	supportBigNumbers: true,
	bigNumberStrings: false,
	synchronize: false, // TODO
	logging: config.database.log,
});

let connection: DataSource;
let initCalled: Promise<DataSource>;

export const initDatabase = async () => {
	if (connection) return connection;
	if (initCalled) return await initCalled;

	Log.msg(`Connecting to ${CONNECTION_STRING}`);

	try {
		initCalled = DATASOURCE_OPTIONS.initialize();
		connection = await initCalled;
	} catch (e) {
		Log.error(e);
		process.exit();
	}
	await doFirstSync();

	Log.msg(`Connected`);
};

export const getDatabase = () => connection ?? null;

export const closeDatabase = () => connection?.destroy();

const doFirstSync = async () => {
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
	} catch (e) {
		return false;
	}
};
