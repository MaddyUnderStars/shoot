/** biome-ignore-all lint/correctness/noEmptyPattern: required by vite */
import crypto from "node:crypto";
import { Client as PgClient } from "pg";
import { getContainerRuntimeClient, StartedNetwork } from "testcontainers";
import { test as baseTest, inject } from "vitest";
import type { APIServer } from "../src/http/server";
import { ConfigSchema } from "../src/util/ConfigSchema";

export const test = baseTest.extend<{
	network: StartedNetwork;
	dbClient: PgClient;
	database: string;
	config: ConfigSchema;
	api: APIServer;
}>({
	network: [
		async ({}, use) => {
			const runtime = await getContainerRuntimeClient();
			const netId = inject("NETWORK_ID");
			const netName = inject("NETWORK_NAME");

			const rawNet = runtime.network.getById(netId);

			const network = new StartedNetwork(runtime, netName, rawNet);

			await use(network);
		},
		{ scope: "file" },
	],

	dbClient: [
		async ({ database }, use) => {
			const postgres = inject("POSTGRES_AUTH");

			const client = new PgClient({
				...postgres,
				database,
			});

			await client.connect();

			await use(client);

			await client.end();
		},
		{ scope: "file" },
	],

	database: [
		async ({}, use) => {
			const postgres = inject("POSTGRES_AUTH");

			const client = new PgClient(postgres);

			await client.connect();

			const name = `shoot_${Math.random().toString().split(".")[1]}`;
			await client.query(`CREATE DATABASE ${name}`);

			await client.end();

			await use(name);
		},
		{ scope: "file" },
	],

	config: [
		async ({ database }, use) => {
			const postgres = inject("POSTGRES_AUTH");

			const config = {
				database: {
					url: `postgres://${postgres.user}:${postgres.password}@${postgres.host}:${postgres.port}/${database}`,
					log: false,
				},
				security: {
					jwt_secret: crypto.randomBytes(256).toString("base64"),
				},
			};

			process.env.NODE_CONFIG = JSON.stringify(config);
			await use(ConfigSchema.parse(config));
		},
		{ auto: true, scope: "file" },
	],

	api: [
		async ({ config }, use) => {
			process.env.NODE_CONFIG = JSON.stringify(config);

			const { APIServer } = await import("../src/http/server");
			const { initDatabase, closeDatabase } = await import(
				"../src/util/database"
			);

			const api = new APIServer();
			await initDatabase();

			await use(api);

			closeDatabase();
		},
		{ scope: "file" },
	],
});
