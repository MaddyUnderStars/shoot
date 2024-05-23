import pg from "pg";

export const createDatabase = async (name: string, host: string) => {
	const client = new pg.Client({
		connectionString: host,
	});

	await client.connect();

	// it's just a test, whatever
	const res = await client.query(`CREATE DATABASE ${name}`);

	await client.end();
};

export const createRandomDatabase = async (host: string) => {
	const name = "shoot_test_" + (Math.random() + 1).toString(36).substring(7);

	await createDatabase(name, host);

	return name;
};

let name: string | undefined = undefined;

export const connectToRandomDb = async (host: string) => {
	name = await createRandomDatabase(host);

	const config = JSON.parse(process.env.NODE_CONFIG as string);

	process.env.NODE_CONFIG = JSON.stringify({
		...config,
		database: {
			log: true,
			url: `${host}${name}`,
		},
	});

	const { initDatabase } = await import("../../src/util/database");
	await initDatabase();
};

export const deleteDatabase = async (host: string) => {
	const client = new pg.Client({
		connectionString: host,
	});

	await client.connect();

	// it's just a test, whatever
	const res = await client.query(`DROP DATABASE ${name}`);

	await client.end();
};
