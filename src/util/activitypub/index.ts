import { APObject, AnyAPObject } from "activitypub-types";
import { WebfingerResponse } from "../../http/wellknown/webfinger";
import { HttpError } from "../httperror";

import { createLogger } from "../log";
const Log = createLogger("activitypub");

export class APError extends HttpError {}

export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";

export const ACTIVITYPUB_FETCH_OPTS = {
	headers: {
		Accept: "application/activity+json",
		"Content-Type": "application/activity+json",
	},
};

export const splitQualifiedMention = (lookup: string) => {
	let domain: string, user: string;
	if (lookup.includes("@")) {
		// lookup a @handle@domain

		if (lookup[0] == "@") lookup = lookup.slice(1);
		[user, domain] = lookup.split("@");
	} else {
		// lookup was a URL ( hopefully )
		const url = new URL(lookup);
		domain = url.hostname;
		user = url.pathname.split("/").reverse()[0];
	}

	return {
		domain,
		user,
	};
};

export const hasAPContext = (data: object): data is APObject => {
	if (!("@context" in data)) return false;
	const context = data["@context"];
	if (Array.isArray(context))
		return !!context.find((x) => x == ACTIVITYSTREAMS_CONTEXT);
	return context == ACTIVITYSTREAMS_CONTEXT;
};

export const resolveAPObject = async <T extends AnyAPObject>(
	data: string | T,
): Promise<T> => {
	// we were already given an object
	if (typeof data != "string") return data;

	Log.verbose(`Fetching from remote ${data}`);

	const ret = await fetch(data, {
		...ACTIVITYPUB_FETCH_OPTS,
	});

	if (!ret.ok)
		throw new APError(`Remote server sent code ${ret.status} : ${ret.statusText}`);

	const json = await ret.json();

	if (!hasAPContext(json)) throw new APError("Object is not APObject");

	return json as T;
};

export const resolveWebfinger = async (
	lookup: string,
): Promise<AnyAPObject> => {
	const { domain } = splitQualifiedMention(lookup);

	Log.verbose(`Performing webfinger lookup ${lookup}`);

	const wellknown = (await fetch(
		`https://${domain}/.well-known/webfinger?resource=${lookup}`,
		{
			...ACTIVITYPUB_FETCH_OPTS,
		},
	).then((x) => x.json())) as WebfingerResponse;

	if (!("links" in wellknown))
		throw new APError(
			`webfinger did not return any links for actor ${lookup}`,
		);

	const link = wellknown.links.find((x) => x.rel == "self");
	if (!link) throw new APError(".well-known did not contain rel=self link");

	return await resolveAPObject<AnyAPObject>(link.href);
};
