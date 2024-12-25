import { hasAPContext } from "./util";

import type {
	APCollectionPage,
	APLink,
	APObject,
	APOrderedCollectionPage,
	AnyAPObject,
} from "activitypub-types";
import { XMLParser } from "fast-xml-parser";
import { ApCache } from "../../entity";
import { config } from "../config";
import { createLogger } from "../log";
import { tryParseUrl } from "../url";
import {
	ACTIVITY_JSON_ACCEPT,
	USER_AGENT,
	WebfingerResponse,
} from "./constants";
import { APError } from "./error";
import { signWithHttpSignature } from "./httpsig";
import { InstanceActor } from "./instanceActor";
import { throwInstanceBlock } from "./instances";
import { splitQualifiedMention } from "./util";

const Log = createLogger("ap:resolve");

export const resolveAPObject = async <T extends AnyAPObject>(
	data: string | T,
	noCache = false,
): Promise<T> => {
	// we were already given an object
	if (typeof data !== "string") {
		if (!noCache)
			await ApCache.create({
				id: data.id,
				raw: data,
			}).save();
		return data;
	}

	if (!noCache) {
		const cache = await ApCache.findOne({ where: { id: data } });
		if (cache) return cache.raw as T;
	}

	const url = new URL(data);

	throwInstanceBlock(url);

	if (url.hostname === config.federation.instance_url.hostname)
		throw new APError(
			"Tried to resolve remote resource, but we are the remote!",
		);

	Log.verbose(`Fetching from remote ${url}`);

	// sign the request
	const signed = signWithHttpSignature(url.toString(), "get", InstanceActor);

	const res = await fetch(url, signed);

	if (!res.ok)
		throw new APError(
			`Remote server sent code ${res.status} : ${res.statusText}`,
			400,
			await res.text(),
		);

	const json = await res.json();

	const header = res.headers.get("content-type");
	if (!header || !ACTIVITY_JSON_ACCEPT.find((x) => header.includes(x)))
		throw new APError(
			`Fetched resource ${url} did not return an activitypub/jsonld content type`,
		);

	if (!hasAPContext(json)) throw new APError("Object is not APObject");

	if (!json.id) throw new APError("Object does not have an ID");

	if (url.origin !== new URL(json.id).origin)
		throw new APError(
			"Object ID origin does not match origin of requested url",
		);

	if (!noCache)
		await ApCache.create({
			id: json.id,
			raw: json,
		}).save();

	return json as T;
};

export const resolveId = (prop: string | AnyAPObject | APLink) => {
	if (typeof prop === "string" && !!tryParseUrl(prop)) return prop;
	if (typeof prop === "string")
		throw new APError(`Cannot resolve ${prop} to a URL ID`);
	if ("id" in prop && prop.id) return prop.id;
	throw new APError(`Cannot resolve ${prop} to a URL ID`);
};

const doWebfingerOrFindTemplate = async (
	lookup: string,
): Promise<WebfingerResponse> => {
	const { domain } = splitQualifiedMention(lookup);

	if (domain === config.federation.instance_url.hostname)
		throw new APError(
			"Tried to resolve remote resource, but we are the remote!",
		);

	const url = new URL(
		`https://${domain}/.well-known/webfinger?resource=${lookup}`,
	);

	throwInstanceBlock(url);

	const opts = {
		// don't send the default headers because
		// they include activitypub content type
		headers: {
			"User-Agent": USER_AGENT,
		},
	};

	let res = await fetch(url, opts);

	if (res.ok) {
		if (res.status === 404)
			throw new APError(
				`Remote server sent code ${res.status} : ${res.statusText}`,
			);

		return WebfingerResponse.parse(await res.json());
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

	const templateUrl = new URL(template.replace("{uri}", lookup));

	throwInstanceBlock(templateUrl);

	res = await fetch(templateUrl, opts);

	if (!res.ok)
		throw new APError(
			`Remote server sent code ${res.status} : ${res.statusText}`,
		);

	return WebfingerResponse.parse(await res.json());
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

	const link = wellknown.links.find((x) => x.rel === "self");
	if (!link || !link.href)
		throw new APError(".well-known did not contain rel=self href");

	return await resolveAPObject<AnyAPObject>(link.href);
};

/**
 * Returns all (to limit) entries of a collection
 */
export const resolveCollectionEntries = async (
	collection: URL,
	limit = 10,
): Promise<Array<string | AnyAPObject>> => {
	if (limit < 0) {
		Log.warn("Limit reached when resolving collection");
		return [];
	}
	limit--;

	const ret: Array<string | AnyAPObject> = [];

	const parent = await resolveAPObject(collection.toString());

	if (!ObjectIsCollection(parent))
		throw new APError(`${collection} is not a collection`);

	const items =
		"items" in parent
			? parent.items
			: "orderedItems" in parent
				? parent.orderedItems
				: undefined;

	if (!items && parent.first)
		return await resolveCollectionEntries(
			new URL(parent.first.toString()),
			limit,
		);

	if (!items) throw new APError("can't find collection items");

	ret.push(...items);

	if (parent.next && typeof parent.next === "string") {
		Log.verbose(`Resolving next page of collection ${parent.id}`);
		ret.push(
			...(await resolveCollectionEntries(new URL(parent.next), limit)),
		);
	}

	return ret;
};

const ObjectIsCollection = (
	obj: APObject,
): obj is APCollectionPage | APOrderedCollectionPage => {
	return (
		obj.type === "OrderedCollection" ||
		obj.type === "OrderedCollectionPage" ||
		obj.type === "Collection" ||
		obj.type === "CollectionPage"
	);
};
