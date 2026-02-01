/** biome-ignore-all lint/correctness/noEmptyPattern: required by vite */
import crypto from "node:crypto";
import { promisify } from "node:util";
import { Client as PgClient } from "pg";
import type { StartedNetwork } from "testcontainers";
import { test as baseTest, inject } from "vitest";
import type { APIServer } from "../src/http/server";
import { ConfigSchema } from "../src/util/ConfigSchema";
import { KEY_OPTIONS } from "../src/util/rsa";
import { createTestDatabase } from "./testUtils/database";
import { getTestNetwork } from "./testUtils/network";

const generateKeyPair = promisify(crypto.generateKeyPair);

export const test = baseTest.extend<{
	network: StartedNetwork;
	dbClient: PgClient;
	database: string;
	config: ConfigSchema;
	api: APIServer;
}>({
	network: [
		async ({}, use) => {
			const network = await getTestNetwork();

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
			await use(await createTestDatabase());
		},
		{ scope: "file" },
	],

	config: [
		async ({ database }, use) => {
			const postgres = inject("POSTGRES_AUTH");

			const keys = await generateKeyPair("rsa", KEY_OPTIONS);

			const config = {
				database: {
					url: `postgres://${postgres.user}:${postgres.password}@${postgres.host}:${postgres.port}/${database}`,
					log: false,
				},
				security: {
					jwt_secret: crypto.randomBytes(256).toString("base64"),
					trust_proxy: "loopback,uniquelocal",
				},
				federation: {
					enabled: true,
					public_key: keys.publicKey,
					private_key: keys.privateKey,
					webapp_url: "http://localhost",
					instance_url: "http://localhost",
				},
				registration: {
					enabled: true,
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
