export const createTestDm = async (
	name: string,
	owner: string,
	recipients: string[],
) => {
	const { createDmChannel } = await import("../../src/util/entity/channel");
	const { getOrFetchUser } = await import("../../src/util/entity/user");
	const { resolveId } = await import("../../src/util/activitypub/resolve");
	const o = await getOrFetchUser(resolveId(owner));
	const r = await Promise.all(
		recipients.map((x) => getOrFetchUser(resolveId(x))),
	);

	const channel = await createDmChannel(name, o, r);

	return channel;
};
