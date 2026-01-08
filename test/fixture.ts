/** biome-ignore-all lint/correctness/noEmptyPattern: required by vite */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import crypto from "node:crypto";
import { Client as PgClient } from "pg";
import { getContainerRuntimeClient, StartedNetwork } from "testcontainers";
import type { DeepPartial } from "typeorm";
import { test as baseTest, inject } from "vitest";
import type { ConfigSchema } from "../src/util/config";

export const test = baseTest.extend<{
	network: StartedNetwork;
	dbClient: PgClient;
	database: string;
	config: DeepPartial<ConfigSchema>;
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
		{ scope: "worker" },
	],

	dbClient: async ({ database }, use) => {
		const postgres = inject("POSTGRES_AUTH");

		const client = new PgClient({
			...postgres,
			database,
		});

		await client.connect();

		await use(client);

		await client.end();
	},

	database: [
		async ({ task }, use) => {
			const postgres = inject("POSTGRES_AUTH");

			const client = new PgClient(postgres);

			await client.connect();

			const name = `shoot_${task.id.replaceAll("-", "_")}`;
			await client.query(`CREATE DATABASE ${name}`);

			await client.end();

			await use(name);
		},
		{ scope: "test" },
	],

	config: [
		async ({ database }, use) => {
			const postgres = inject("POSTGRES_AUTH");

			const config = {
				database: {
					url: `postgres://${postgres.user}:${postgres.password}@${postgres.host}:${postgres.port}/${database}`,
					log: true,
				},
				security: {
					jwt_secret: crypto.randomBytes(256).toString("base64"),
				},
			};

			process.env.NODE_CONFIG = JSON.stringify(config);
			await use(config);
		},
		{ auto: true },
	],
});
