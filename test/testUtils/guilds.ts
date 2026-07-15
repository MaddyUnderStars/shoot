import { StartedTestContainer } from "testcontainers";
import { getTestString } from "./random.js";
import type { TestUser } from "./users.js";
import { isApiServer } from "./isApiServer.js";
import { getShootContainerUrl } from "./container.js";
import type { Guild, PublicGuild } from "../../src/entity/guild.js";
import { APIServer } from "../../src/http/server.js";

export async function createTestGuild(
	owner: TestUser,
	target: StartedTestContainer,
): Promise<PublicGuild>;
export async function createTestGuild(owner: TestUser, target?: APIServer): Promise<Guild>;
export async function createTestGuild(
	owner: TestUser,
	target?: APIServer | StartedTestContainer,
): Promise<PublicGuild | Guild> {
	const name = getTestString();

	if (!target || isApiServer(target)) {
		const { createGuild } = await import("../../src/util/entity/guild.js");
		const { getOrFetchUser } = await import("../../src/util/entity/user.js");

		const user = await getOrFetchUser(owner.user.mention);
		return await createGuild(name, user);
	}

	const res = await fetch(new URL("/guild", getShootContainerUrl(target)), {
		method: "POST",
		body: JSON.stringify({
			name: getTestString(),
		}),
		headers: {
			Authorization: owner.token,
			"Content-Type": "application/json",
		},
	});

	const json = await res.json();

	return json as PublicGuild;
}
