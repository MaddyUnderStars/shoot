import { ACTIVITYSTREAMS_CONTEXT } from "./constants";

import {
	type APActivity,
	type APActor,
	type APObject,
	type AnyAPObject,
	type ContextField,
	ObjectIsApplication,
	ObjectIsGroup,
	ObjectIsPerson,
} from "activitypub-types";
import { APError } from "./error";

export const splitQualifiedMention = (lookup: string) => {
	let domain: string;
	let user: string;
	if (lookup.includes("@")) {
		// lookup a @handle@domain
		if (lookup[0] === "@") lookup = lookup.slice(1);
		[user, domain] = lookup.split("@");
	} else {
		// lookup was a URL ( hopefully )
		try {
			const url = new URL(lookup);
			domain = url.hostname;
			user = url.pathname.split("/").reverse()[0];
		} catch (e) {
			throw new APError("Lookup is not valid handle or URL");
		}
	}

	return {
		domain,
		user,
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
	return {
		"@context": [
			"https://www.w3.org/ns/activitystreams",
			"https://w3id.org/security/v1",
		],
		...obj,
	};
};
