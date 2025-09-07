import crypto from "node:crypto";
import { findAll, innerText } from "domutils";
import { DomHandler, Parser } from "htmlparser2";
import { USER_AGENT } from "../activitypub/constants";
import { config } from "../config";
import { EMBED_GENERATORS } from "./generators";

export const EMBED_FETCH_OPTS: RequestInit = {
	headers: {
		"User-Agent": `${USER_AGENT}; like discordbot`,
	},

	redirect: "follow",
};

// this type isn't exported
// and conflicts with normal DOM types
type Document = DomHandler["root"];

export const fetchDom = async (url: URL) => {
	const res = await fetch(url, EMBED_FETCH_OPTS);

	const handler = new DomHandler();
	const parser = new Parser(handler);

	parser.parseComplete(await res.text());

	return handler.root;
};

// todo: handle arrays
export const findMeta = (root: Document, name: string): string | null =>
	findDomTag(root, "meta", name);

export const findDomTag = (root: Document, tagName: string, key?: string) =>
	findAll(
		(elem) =>
			elem.tagName === tagName &&
			(key
				? elem.attribs.property === key || elem.attribs.name === key
				: true),
		root,
	).map((x) => x.attribs.content ?? innerText(x))?.[0] ?? null;

export const tryParseNumber = (str: string | undefined | null) => {
	if (!str) return undefined;

	return Number.parseInt(str);
};

/**
 * Generates an Embed object. Does not save or check for duplicates.
 */
export const generateUrlPreview = async (url: URL) => {
	// check the content type of the url
	const res = await fetch(url, {
		...EMBED_FETCH_OPTS,
		method: "HEAD",
	});

	const type = res.headers.get("Content-Type");
	if (type?.startsWith("image/") || type?.startsWith("video/")) {
		// if it's image/* or video/* return simple embed

		return EMBED_GENERATORS.simple(url, res);
	}

	// otherwise, use a generator

	return EMBED_GENERATORS.generic(url, res);
};

type ImageMetadata = {
	width: number;
	height: number;
};

export const getImageMetadata = async (
	url: URL,
	width: number,
	height: number,
): Promise<ImageMetadata> => {
	if (!config.media_proxy.enabled) return { width, height };

	const path = `/meta/fit-in/${width}x${height}/${url.host}/${url.pathname}`;

	const endpoint = signMediaProxyUrl(new URL(path, config.media_proxy.url));

	const res = await fetch(endpoint);
	const json = await res.json();

	return { width: json.width, height: json.height };
};

const signMediaProxyUrl = (url: URL) => {
	if (!config.media_proxy.secret) return url;

	const hash = crypto
		.createHmac("sha1", config.media_proxy.secret)
		.update(url.pathname)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");

	url.pathname = `${hash}/${url.pathname}`;
	return url;
};

export const getImageProxyUrl = (
	url: URL,
	width: number,
	height: number,
): URL => {
	if (!config.media_proxy.enabled) return url;

	const path = `fit-in/${width}x${height}/${url.host}/${url.pathname}`;

	const ret = new URL(path, config.media_proxy.url);

	return signMediaProxyUrl(ret);
};
