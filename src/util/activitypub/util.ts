import {
	type AnyAPObject,
	type APActivity,
	type APActor,
	type APObject,
	type ContextField,
	ObjectIsApplication,
	ObjectIsGroup,
	ObjectIsPerson,
} from "activitypub-types";
import { tryParseUrl } from "../url";
import { ACTIVITYSTREAMS_CONTEXT } from "./constants";
import { APError } from "./error";

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
		id = url.pathname.split("/").reverse()[0]; // not great
	}

	return {
		domain,
		id,
	};
};

export const hasAPContext = (data: object): data is APObject => {
	if (!("@context" in data)) return false;
	const context = data["@context"] as ContextField | ContextField[];
	if (Array.isArray(context))
		return !!context.find((x) => x === ACTIVITYSTREAMS_CONTEXT);
	return context === ACTIVITYSTREAMS_CONTEXT;
};

export const APObjectIsActor = (obj: AnyAPObject): obj is APActor => {
	return (
		ObjectIsPerson(obj) || ObjectIsApplication(obj) || ObjectIsGroup(obj)
	);
};

export const addContext = <T extends AnyAPObject | APActivity>(
	obj: T,
): T & { "@context": ContextField[] } => {
	// For some reason if I move this into the return, it causes a type error
	// even though ContextField is string | Record<string, string> ???
	const context: ContextField[] = [
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
