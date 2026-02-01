import { getTestString } from "./random";
import type { TestUser } from "./users";

export const createTestGuild = async (owner: TestUser) => {
	const name = `${getTestString()}`;

	const { createGuild } = await import("../../src/util/entity/guild");
	const { getOrFetchUser } = await import("../../src/util/entity/user");

	const user = await getOrFetchUser(owner.user.mention);
	const guild = await createGuild(name, user);

	return guild;
};
