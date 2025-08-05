import { findAll } from "domutils";
import { DomHandler, Parser } from "htmlparser2";
import providers from "oembed-providers/providers.json";
import { z } from "zod";
import { Embed, EmbedTypes } from "../../entity/embed";
import { config } from "../config";
import { tryParseUrl } from "../url";

const USER_AGENT = `Shoot (https://github.com/maddyunderstars/shoot; +${config.federation.webapp_url.origin}; like discordbot)`;

const EMBED_FETCH_OPTS = {
	headers: {
		"User-Agent": USER_AGENT,
	},
};

const IGNORE_OEMBED = ["fxtwitter.com"];

/**
 * Generates an Embed object. Does not save or check for duplicates.
 */
export const generateUrlPreview = async (url: URL) => {
	const oembedUrl = await discoverOEmbed(url);

	let parsed: OEmbed;

	if (oembedUrl) {
		const resp = await fetch(oembedUrl, EMBED_FETCH_OPTS);

		const json = await resp.json();

		parsed = OEmbed.parse(json);
	} else {
		parsed = await buildOEmbed(url);
	}

	const embed = Embed.create({
		target: url.toString(),
		...parsed,
		type: EmbedTypes[parsed.type],
	});

	return embed;
};

// if a site doesn't provide oembed, build it ourselves
const buildOEmbed = async (url: URL): Promise<OEmbed> => {
	const resp = await fetch(url, EMBED_FETCH_OPTS);

	const handler = new DomHandler();
	const parser = new Parser(handler);

	const text = await resp.text();
	parser.parseComplete(text);

	const metas = findAll(
		(elem) =>
			!!(
				elem.tagName === "meta" &&
				elem.attribs?.property &&
				elem.attribs?.content
			),
		handler.root,
	);

	return {
		type: "rich",
		provider_url: url.origin,
		provider_name: getMetaContent(metas, "og:site_name"),
		author_name:
			getMetaContent(metas, "twitter:creator") ??
			getMetaContent(metas, "article:author"),
		thumbnail_url:
			getMetaContent(metas, "twitter:image") ??
			getMetaContent(metas, "og:image"),
		thumbnail_height: tryParseInt(
			getMetaContent(metas, "twitter:image:height") ??
				getMetaContent(metas, "og:image:height"),
		),
		thumbnail_width: tryParseInt(
			getMetaContent(metas, "twitter:image:width") ??
				getMetaContent(metas, "og:image:width"),
		),
		title: getMetaContent(metas, "og:title"),
	};
};

const tryParseInt = (x: string | undefined) => {
	if (x === undefined) return x;
	const ret = Number.parseInt(x);
	if (Number.isNaN(ret)) return undefined;
	return ret;
};

const getMetaContent = (metas: ReturnType<typeof findAll>, name: string) =>
	metas.find((x) => x.attribs.property === name)?.attribs.content;

const findProviderInRegistry = (url: URL) => {
	const provider = providers.find(
		(x) => new URL(x.provider_url).origin === url.origin,
	);
	if (!provider) return null;

	// TODO: check schemas

	const endpointUrl = provider.endpoints[0];
	if (!endpointUrl) return null;

	const endpoint = new URL(endpointUrl.url);
	endpoint.searchParams.append("url", url.toString());
	endpoint.searchParams.append("format", "json");

	return endpoint;
};

const discoverOEmbed = async (url: URL): Promise<URL | null> => {
	if (IGNORE_OEMBED.includes(url.hostname)) return null;

	if (url.protocol !== "https:")
		throw new EmbedGenerationError(`Unsupported protocol ${url.protocol}`);

	// first check if it's in the registry
	// some sites, like youtube, don't follow the discovery part of the spec
	const registry = findProviderInRegistry(url);
	if (registry) return registry;

	const resp = await fetch(url, EMBED_FETCH_OPTS);

	// check link headers
	const link = findLinkHeader(resp.headers);
	if (link) {
		await resp.text();
		return link;
	}

	// otherwise check body content
	const tag = await findLinkTag(await resp.text());
	if (!tag) return null;

	return tryParseUrl(tag);
};

const findLinkTag = async (body: string) => {
	const handler = new DomHandler();
	const parser = new Parser(handler);

	parser.parseComplete(body);

	const links = findAll(
		(elem) =>
			!!(
				elem.tagName === "link" &&
				elem.attribs.type === "application/json+oembed"
			),
		handler.root,
	);

	if (!links.length) return null;

	return links[0].attributes.find((x) => x.name === "href")?.value ?? null;
};

const findLinkHeader = (headers: Headers) => {
	const links = headers.get("link");
	if (!links) return null;

	const split = links.split(",");

	const found = split.find((x) =>
		x.includes(`type="application/json+oembed"`),
	);

	if (!found) return null;

	const match = found.match(/<(.*)>/)?.[1] ?? null;

	if (!match) return null;

	const parsed = tryParseUrl(match);

	return parsed;
};

class EmbedGenerationError extends Error {}

const OEmbed = z
	.object({
		version: z.literal("1.0"), // not optional per spec...
		title: z.string(),
		author_name: z.string(),
		author_url: z.string(),
		provider_name: z.string(),
		provider_url: z.string(),
		cache_age: z.number(),
		thumbnail_url: z.string(),
		thumbnail_width: z.number(),
		thumbnail_height: z.number(),
	})
	.partial()
	.and(
		z.union([
			z.object({
				type: z.literal("link"),
			}),
			z.object({
				type: z.literal("photo"),
				url: z.string().url().optional(),
				width: z.number().min(1).optional(),
				height: z.number().min(1).optional(),
			}),
			z.object({
				type: z.literal("video"),
				html: z.string().optional(),
				width: z.number().min(1).optional(),
				height: z.number().min(1).optional(),
			}),
			z.object({
				type: z.literal("rich"),
				html: z.string().optional(),
				width: z.number().optional(),
				height: z.number().optional(),
			}),
		]),
	);

type OEmbed = z.infer<typeof OEmbed>;
