/** owner: mention, members: user ids */
export const createTestGuild = async (
	name: string,
	owner: string,
	members: string[],
) => {
	const { createGuild, getOrFetchUser, joinGuild } = await import(
		"../../src/util"
	);

	const o = await getOrFetchUser(owner);
	const guild = await createGuild(name, o);

	await Promise.all(
		members.map(async (x) =>
			joinGuild((await getOrFetchUser(x)).id, guild.id),
		),
	);

	return guild;
};
