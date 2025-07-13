/** owner: mention, members: user ids */
export const createTestGuild = async (
	name: string,
	owner: string,
	members: string[],
) => {
	const { createGuild, joinGuild } = await import(
		"../../src/util/entity/guild"
	);
	const { getOrFetchUser } = await import("../../src/util/entity/user");

	const { resolveId } = await import("../../src/util/activitypub/resolve");

	const o = await getOrFetchUser(resolveId(owner));
	const guild = await createGuild(name, o);

	await Promise.all(
		members.map(async (x) =>
			joinGuild(
				(await getOrFetchUser(resolveId(x))).mention,
				guild.mention,
			),
		),
	);

	return guild;
};
