import { findAll, innerText } from "domutils";
import { DomHandler, Parser } from "htmlparser2";
import { USER_AGENT } from "../activitypub/constants";
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
