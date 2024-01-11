import { hasAPContext } from "./util";

import { AnyAPObject } from "activitypub-types";
import { XMLParser } from "fast-xml-parser";
import { ApCache } from "../../entity";
import { WebfingerResponse } from "../../http/wellknown/webfinger";
import { createLogger } from "../log";
import { USER_AGENT } from "./constants";
import { APError } from "./error";
import { HttpSig } from "./httpsig";
import { InstanceActor } from "./instanceActor";
import { splitQualifiedMention } from "./util";

const Log = createLogger("ap:resolve");

export const resolveAPObject = async <T extends AnyAPObject>(
	data: string | T,
): Promise<T> => {
	// we were already given an object
	if (typeof data != "string") return data;

	const cache = await ApCache.findOne({ where: { id: data }})
	if (cache) return cache.raw as T;

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
