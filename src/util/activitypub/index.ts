import {
	APActivity,
	APActor,
	APObject,
	AnyAPObject,
	ContextField,
	ObjectIsApplication,
	ObjectIsGroup,
	ObjectIsPerson,
} from "activitypub-types";
import { HttpError } from "../httperror";

import { XMLParser } from "fast-xml-parser";
import { User } from "../../entity";
import { DMChannel } from "../../entity/DMChannel";
import { Channel } from "../../entity/channel";
import { WebfingerResponse } from "../../http/wellknown/webfinger";
import { getOrFetchUser } from "../entity";
import { createLogger } from "../log";
import { tryParseUrl } from "../url";
import { HttpSig } from "./httpsig";
import { InstanceActor } from "./instanceActor";
const Log = createLogger("activitypub");

export class APError extends HttpError {}

export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";

export const ACTIVITY_JSON_ACCEPT = [
	'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
	"application/activity+json",
];

export const USER_AGENT =
	"Unnamed Activitypub Chat Server (https://github.com/maddyunderstars)";

export const ACTIVITYPUB_FETCH_OPTS: RequestInit = {
	headers: {
		Accept: "application/activity+json",
		"Content-Type": "application/activity+json",
		"User-Agent": USER_AGENT,
	},

	redirect: "follow",
};

export type ActorMention = `${string}@${string}`;

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

	// sign the request
	const signed = HttpSig.sign(data, "get", InstanceActor, "/actor");

	const res = await fetch(data, signed);

	if (!res.ok)
		throw new APError(
			`Remote server sent code ${res.status} : ${
				res.statusText
			} : ${await res.text()}`,
		);

	const json = await res.json();

	if (!hasAPContext(json)) throw new APError("Object is not APObject");

	return json as T;
};

const doWebfingerOrFindTemplate = async (
	lookup: string,
): Promise<WebfingerResponse> => {
	const { domain } = splitQualifiedMention(lookup);

	const url = new URL(
		`https://${domain}/.well-known/webfinger?resource=${lookup}`,
	);

	const opts = {
		// don't send the default headers because
		// they include activitypub content type
		headers: {
			"User-Agent": USER_AGENT,
		},
	};

	let res = await fetch(url, opts);

	if (res.ok) {
		if (res.status == 404)
			throw new APError(
				`Remote server sent code ${res.status} : ${res.statusText}`,
			);
		return await res.json();
	}

	Log.verbose(`Attempting to find webfinger template to resolve ${lookup}`);

	const hostmeta = await fetch(`${url.origin}/.well-known/host-meta`);
	if (!hostmeta.ok) throw new APError("Could not resolve webfinger address");
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
	});
	const obj = parser.parse(await hostmeta.text());

	const template = obj?.XRD?.Link?.["@_template"];
	if (!template)
		throw new APError(
			"host-meta did not contain root->XRD->Link[template]",
		);

	res = await fetch(template.replace("{uri}", lookup), opts);

	if (!res.ok)
		throw new APError(
			`Remote server sent code ${res.status} : ${res.statusText}`,
		);

	return await res.json();
};

export const resolveWebfinger = async (
	lookup: string,
): Promise<AnyAPObject> => {
	Log.verbose(`Performing webfinger lookup ${lookup}`);

	const wellknown = await doWebfingerOrFindTemplate(lookup);

	if (!("links" in wellknown))
		throw new APError(
			`webfinger did not return any links for actor ${lookup}`,
		);

	const link = wellknown.links.find((x) => x.rel == "self");
	if (!link) throw new APError(".well-known did not contain rel=self link");

	return await resolveAPObject<AnyAPObject>(link.href);
};

export const APObjectIsActor = (obj: AnyAPObject): obj is APActor => {
	return (
		ObjectIsPerson(obj) || ObjectIsApplication(obj) || ObjectIsGroup(obj)
	);
};

export const createUserForRemotePerson = async (lookup: string | APActor) => {
	const domain = typeof lookup == "string" ? splitQualifiedMention(lookup).domain : new URL(lookup.id!).hostname;

	// If we were given a URL, this is probably a actor URL
	// otherwise, treat it as a username@domain handle
	const obj =
		typeof lookup == "string"
			? tryParseUrl(lookup)
				? await resolveAPObject(lookup)
				: await resolveWebfinger(lookup)
			: lookup;

	if (!APObjectIsActor(obj))
		throw new APError("Resolved object is not Person");

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Person but does not contain public key",
		);

	if (!obj.id) throw new APError("Resolved object must have ID");

	return User.create({
		domain,

		remote_address: obj.id,
		name: obj.preferredUsername || obj.id,
		display_name: obj.name || obj.preferredUsername,
		public_key: obj.publicKey.publicKeyPem,

		collections: {
			inbox: obj.inbox.toString(),
			outbox: obj.outbox.toString(),
			followers: obj.followers?.toString(),
			following: obj.following?.toString(),
		},
	});
};

export const createChannelFromRemoteGroup = async (
	lookup: string | APActor,
) => {
	const obj =
		typeof lookup == "string"
			? tryParseUrl(lookup)
				? await resolveAPObject(lookup)
				: await resolveWebfinger(lookup)
			: lookup;

	if (!ObjectIsGroup(obj)) throw new APError("Resolved object is not Group");

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Group but does not contain public key",
		);

	if (!obj.attributedTo || typeof obj.attributedTo != "string")
		throw new APError(
			"Resolved group doesn't have attributedTo, we don't know what owns it",
		);

	let channel: Channel;
	// TODO: check type of channel of remote obj
	switch ("dm") {
		case "dm":
			channel = DMChannel.create({
				name: obj.name,
				owner: await getOrFetchUser(obj.attributedTo),
				recipients: [],
				remote_address: obj.id,
				public_key: obj.publicKey.publicKeyPem,
			});
			// TODO: start fetching recipients over time
			break;
		default:
			throw new APError("Resolved group was not a recognisable type");
	}

	return channel;
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
