import { type ActorMention } from "../../util/activitypub/constants.js";

export const resolve = async (lookup: string) => {
	const { initDatabase, closeDatabase } = await import("../../util/database.js");

	await initDatabase();

	const { resolveAPObject, resolveWebfinger } = await import("../../util/activitypub/resolve.js");
	const { tryParseUrl } = await import("../../util/url.js");

	const parsedLookup = tryParseUrl(lookup) ?? lookup;

	try {
		const res =
			parsedLookup instanceof URL &&
			parsedLookup.protocol !== "acct:" &&
			parsedLookup.protocol !== "invite:"
				? await resolveAPObject(parsedLookup)
				: await resolveWebfinger(lookup as ActorMention);

		console.log(res);
	} finally {
		closeDatabase();
	}
};
