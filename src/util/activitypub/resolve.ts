import { hasAPContext } from "./util";

import {
	APCollectionPage,
	APObject,
	APOrderedCollectionPage,
	AnyAPObject,
} from "activitypub-types";
import { XMLParser } from "fast-xml-parser";
import { ApCache } from "../../entity";
import { config } from "../config";
import { createLogger } from "../log";
import {
	ACTIVITY_JSON_ACCEPT,
	USER_AGENT,
	WebfingerResponse,
} from "./constants";
import { APError } from "./error";
import { HttpSig } from "./httpsig";
import { InstanceActor } from "./instanceActor";
import { splitQualifiedMention } from "./util";

const Log = createLogger("ap:resolve");

export const resolveAPObject = async <T extends AnyAPObject>(
	data: string | T,
	noCache = false,
): Promise<T> => {
	// we were already given an object
	if (typeof data != "string") {
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

	if (new URL(data).hostname == config.federation.instance_url.hostname)
		throw new APError(
			`Tried to resolve remote resource, but we are the remote!`,
		);

	Log.verbose(`Fetching from remote ${data}`);

	// sign the request
	const signed = HttpSig.sign(data, "get", InstanceActor, "/actor");

	const res = await fetch(data, signed);

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
			`Fetched resource ${data} did not return an activitypub/jsonld content type`,
		);

	if (!hasAPContext(json)) throw new APError("Object is not APObject");

	if (!noCache)
		await ApCache.create({
			id: json.id,
			raw: json,
		}).save();

	return json as T;
};

export const doWebfingerOrFindTemplate = async (
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

	res = await fetch(template.replace("{uri}", lookup), opts);

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

	const link = wellknown.links.find((x) => x.rel == "self");
	if (!link || !link.href)
		throw new APError(".well-known did not contain rel=self href");

	return await resolveAPObject<AnyAPObject>(link.href);
};

/**
 * Returns all the IDs of a collection
 */
export const resolveCollectionEntries = async (
	collection: URL,
	limit: number = 10,
): Promise<Array<string>> => {
	if (limit < 0) throw new APError(`Limit reached when resolving collection`);
	limit--;

	const ret: Array<string> = [];

	/**
	 * TOOD: Is disabling cache for collections a good idea?
	 * We might want to actually disable cache for only the last page,
	 * and then when we refetch this collection, we just need to start from the end again
	 * But that might be a bit complicated?
	 */

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
	else if (!items) throw new APError("can't find collection items");

	for (const item of items) {
		// TODO: if we just return all the IDs, then collections that just return the full objects won't be cached!
		// this is bad btw!!!

		let id =
			typeof item == "string" ? item : "id" in item ? item.id : undefined;

		if (!id) continue;

		ret.push(id);
	}

	if (parent.next && typeof parent.next == "string") {
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
		obj.type == "OrderedCollection" ||
		obj.type == "OrderedCollectionPage" ||
		obj.type == "Collection" ||
		obj.type == "CollectionPage"
	);
};
