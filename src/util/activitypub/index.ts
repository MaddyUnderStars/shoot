import {
	APActivity,
	APObject,
	AnyAPObject,
	ContextField,
	ObjectIsPerson,
} from "activitypub-types";
import { HttpError } from "../httperror";

import { User } from "../../entity";
import { WebfingerResponse } from "../../http/wellknown/webfinger";
import { config } from "../config";
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
	const context = data["@context"] as ContextField | ContextField[];
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

	const res = await fetch(data, {
		...ACTIVITYPUB_FETCH_OPTS,
	});

	if (!res.ok)
		throw new APError(
			`Remote server sent code ${res.status} : ${res.statusText}`,
		);

	const json = await res.json();

	if (!hasAPContext(json)) throw new APError("Object is not APObject");

	return json as T;
};

export const resolveWebfinger = async (
	lookup: string,
): Promise<AnyAPObject> => {
	const { domain } = splitQualifiedMention(lookup);

	Log.verbose(`Performing webfinger lookup ${lookup}`);

	const res = await fetch(
		`https://${domain}/.well-known/webfinger?resource=${lookup}`,
		{
			...ACTIVITYPUB_FETCH_OPTS,
		},
	);

	if (!res.ok)
		throw new APError(
			`Remote server sent code ${res.status} : ${res.statusText}`,
		);

	const wellknown = (await res.json()) as WebfingerResponse;

	if (!("links" in wellknown))
		throw new APError(
			`webfinger did not return any links for actor ${lookup}`,
		);

	const link = wellknown.links.find((x) => x.rel == "self");
	if (!link) throw new APError(".well-known did not contain rel=self link");

	return await resolveAPObject<AnyAPObject>(link.href);
};

export const createUserForRemotePerson = async (lookup: string) => {
	const obj = await resolveWebfinger(lookup);
	if (!ObjectIsPerson(obj))
		throw new APError("Resolved object is not Person");

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Person but does not contain public key",
		);

	return User.create({
		username: obj.preferredUsername || lookup,
		display_name: obj.name || obj.preferredUsername,
		domain: splitQualifiedMention(lookup).domain,
		public_key: obj.publicKey.publicKeyPem,

		activitypub_addresses: {
			inbox: obj.inbox.toString(),
			outbox: obj.outbox.toString(),
			followers: obj.followers?.toString(),
			following: obj.following?.toString(),
		},
	});
};

export const getOrCreateUser = async (user_id: string) => {
	const mention = splitQualifiedMention(user_id);

	let user = await User.findOne({
		where: {
			username: mention.user,
			domain: mention.domain,
		},
	});

	if (!user && config.federation.enabled) {
		// Fetch from remote instance
		user = await createUserForRemotePerson(user_id);
		await user.save();
	} else if (!user) {
		throw new APError("User could not be found", 404);
	}

	return user;
};

export const addContext = <T extends AnyAPObject | APActivity>(
	obj: T,
): T & { "@context": ContextField } => {
	return {
		...obj,
		"@context": "https://www.w3.org/ns/activitystreams",
	};
};
