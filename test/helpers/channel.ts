export const createTestDm = async (
	name: string,
	owner: string,
	recipients: string[],
) => {
	const { createDmChannel, getOrFetchUser } = await import("../../src/util");
	const o = await getOrFetchUser(owner);
	const r = await Promise.all(recipients.map((x) => getOrFetchUser(x)));

	const channel = await createDmChannel(name, o, r);

	return channel;
};
