import crypto from "node:crypto";
import { promisify } from "node:util";
import {
	GenericContainer,
	type StartedTestContainer,
	Wait,
} from "testcontainers";
import { merge } from "ts-deepmerge";
import type { DeepPartial } from "typeorm";
import { inject } from "vitest";
import type { ConfigSchema } from "../../src/util/ConfigSchema";
import { KEY_OPTIONS } from "../../src/util/rsa";
import { createTestDatabase } from "./database";
import { getTestNetwork } from "./network";

const generateKeyPair = promisify(crypto.generateKeyPair);

export const startShootContainer = async (
	name: string,
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
		.withHostname(name)
		.withNetwork(network)
		.withExposedPorts(80)
		.withWaitStrategy(
			Wait.forHttp("/.well-known/nodeinfo/2.0", 80, {
				abortOnContainerExit: true,
			}),
		)
		.withEnvironment({
			PORT: "80",
			DANGEROUS_NO_TLS: "1",
			NODE_TLS_REJECT_UNAUTHORIZED: "1",
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
							log: true,
						},
						federation: {
							enabled: true,
							public_key: keys.publicKey,
							private_key: keys.privateKey,
							webapp_url: new URL(`http://${name}`),
							instance_url: new URL(`http://${name}`),
						},
					} satisfies DeepPartial<ConfigSchema>,
					config ?? {},
				),
			),
		})
		.start();

	return shoot;
};

export const getShootContainerUrl = (container: StartedTestContainer) => {
	return new URL(
		`http://${container.getHost()}:${container.getFirstMappedPort()}`,
	);
};
