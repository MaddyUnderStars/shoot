import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Network } from "testcontainers";
import type { TestProject } from "vitest/node";

const create = async (project: TestProject) => {
	const network = await new Network().start();

	const postgres = await new PostgreSqlContainer("postgres")
		.withNetwork(network)
		.start();

	project.provide("NETWORK_ID", network.getId());
	project.provide("NETWORK_NAME", network.getName());
	project.provide("POSTGRES_ID", postgres.getId());
	project.provide("POSTGRES_AUTH", {
		host: postgres.getHost(),
		port: postgres.getPort(),
		database: postgres.getDatabase(),
		user: postgres.getUsername(),
		password: postgres.getPassword(),
		hostname: postgres.getHostname(),
	});

	return { postgres, network };
};

export default async (project: TestProject) => {
	// await GenericContainer.fromDockerfile(".")
	// 	.withBuildkit()
	// 	.withCache(true)
	// 	.build("shoot:test", { deleteOnExit: false });

	let res = await create(project);

	project.onTestsRerun(async () => {
		await res.postgres.stop({ removeVolumes: true });
		await res.network.stop();

		res = await create(project);
	});

	return async () => {
		await res.postgres.stop({ removeVolumes: true });
		await res.network.stop();
	};
};

declare module "vitest" {
	export interface ProvidedContext {
		NETWORK_ID: string;
		NETWORK_NAME: string;

		POSTGRES_ID: string;
		POSTGRES_AUTH: {
			host: string;
			port: number;
			database: string;
			user: string;
			password: string;
			hostname: string;
		};
	}
}
