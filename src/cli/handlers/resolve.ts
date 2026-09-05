import { type ActorMention } from "../../util/activitypub/constants.js";
import { ParseArgsPositionals, ParseArgsValues } from "./index.js";

const resolveHandler = async (_values: ParseArgsValues, positionals: ParseArgsPositionals) => {
	const [lookup] = positionals;

	const { initDatabase } = await import("../../util/database.js");

	await initDatabase();

	const { resolveAPObject, resolveWebfinger } = await import("../../util/activitypub/resolve.js");
	const { tryParseUrl } = await import("../../util/url.js");

	const parsedLookup = tryParseUrl(lookup) ?? lookup;

	const res =
		parsedLookup instanceof URL &&
		parsedLookup.protocol !== "acct:" &&
		parsedLookup.protocol !== "invite:"
			? await resolveAPObject(parsedLookup)
			: await resolveWebfinger(lookup as ActorMention);

	console.log(res);
};

export const resolve = {
	positionals: ["lookup"],
	description: "Resolve an ActivityPub Webfinger or ID",
	options: {},
	handler: resolveHandler,
};
