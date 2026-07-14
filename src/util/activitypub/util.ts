import { AnyAPObject, APObject, type LdContextField } from "@shootpub/activitypub-types/object";
import { tryParseUrl } from "../url.js";
import { ACTIVITYSTREAMS_CONTEXT } from "./constants.js";
import { APError } from "./error.js";

/**
 * Split a string or URL into the domain and user parts. For URLs, this is NOT the username auth part
 * @param lookup Either an ActorMention or URL string
 * @returns Domain and user parts of input
 */
export const splitQualifiedMention = (lookup: string | URL) => {
	let domain: string;
	let id: string;
	if (typeof lookup === "string" && lookup.includes("@")) {
		// lookup a @handle@domain
		if (lookup[0] === "@") lookup = lookup.slice(1);
		[id, domain] = lookup.split("@");
	} else {
		// lookup was a URL ( hopefully )

		const url = tryParseUrl(lookup);
		if (!url) {
			throw new APError("Lookup is not valid handle or URL");
		}

		domain = url.hostname;
		id = url.pathname.split("/").toReversed()[0]; // not great
	}

	return {
		domain,
		id,
	};
};

type ContextField = LdContextField | LdContextField[];

export const hasAPContext = (data: unknown): data is APObject => {
	if (typeof data !== "object" || !data) return false;
	if (!("@context" in data)) return false;
	const context = data["@context"] as ContextField;
	if (Array.isArray(context)) return !!context.find((x) => x === ACTIVITYSTREAMS_CONTEXT);
	return context === ACTIVITYSTREAMS_CONTEXT;
};

export const addContext = <T extends AnyAPObject>(obj: T): T & { "@context": ContextField } => {
	// For some reason if I move this into the return, it causes a type error
	// even though ContextField is string | Record<string, string> ???
	const context: ContextField = [
		"https://www.w3.org/ns/activitystreams",
		"https://w3id.org/security/v1",
		"https://purl.archive.org/socialweb/webfinger",
		{
			manuallyApprovesFollowers: "as:manuallyApprovesFollowers",
		},
	];

	return {
		"@context": context,
		...obj,
	};
};
