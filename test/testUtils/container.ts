import crypto from "node:crypto";
import { promisify } from "node:util";
import { GenericContainer, Wait } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/build/wait-strategies/log-wait-strategy";
import { merge } from "ts-deepmerge";
import type { DeepPartial } from "typeorm";
import { inject } from "vitest";
import type { ConfigSchema } from "../../src/util/ConfigSchema";
import { KEY_OPTIONS } from "../../src/util/rsa";
import { createTestDatabase } from "./database";
import { getTestNetwork } from "./network";

const generateKeyPair = promisify(crypto.generateKeyPair);

export const startShootContainer = async (
	config?: DeepPartial<ConfigSchema>,
) => {
	// const image = await GenericContainer.fromDockerfile(".")
	// 	.withCache(true)
	// 	.withBuildkit()
	// 	.build("shoot:latest");

	const databaseName = await createTestDatabase();
	const postgres = inject("POSTGRES_AUTH");

	const keys = await generateKeyPair("rsa", KEY_OPTIONS);

	const network = await getTestNetwork();

	const shoot = await new GenericContainer("shoot:test")
		.withPullPolicy({ shouldPull: () => false })
		.withNetwork(network)
		.withExposedPorts(3001)
		.withEnvironment({
			NODE_CONFIG: JSON.stringify(
				merge(
					{
						log: {
							include_date: false,
						},
						registration: {
							enabled: true,
						},
						security: {
							jwt_secret: crypto
								.randomBytes(256)
								.toString("base64"),
						},
						database: {
							url: `postgres://${postgres.user}:${postgres.password}@${postgres.hostname}/${databaseName}`,
						},
						federation: {
							enabled: true,
							public_key: keys.publicKey,
							private_key: keys.privateKey,
							webapp_url: new URL("http://localhost"),
							instance_url: new URL("http://localhost"),
						},
					} satisfies DeepPartial<ConfigSchema>,
					config ?? {},
				),
			),
		})
		.start();

	return shoot;
};
