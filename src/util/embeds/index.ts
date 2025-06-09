import { z } from "zod";
import { tryParseUrl } from "../url";
import { Embed, EmbedTypes } from "../../entity/embed";
import providers from "oembed-providers/providers.json";
import { DomHandler, Parser } from "htmlparser2";
import { findAll } from "domutils";

/**
 * Generates an Embed object. Does not save or check for duplicates.
 */
export const generateUrlPreview = async (url: URL) => {
	const oembedUrl = await discoverOEmbed(url);

	if (!oembedUrl)
		throw new EmbedGenerationError("Failed to discover OEmbed endpoint");

	const resp = await fetch(oembedUrl);

	const json = await resp.json();

	const parsed = OEmbed.parse(json);

	const embed = Embed.create({
		target: url.toString(),
		...parsed,
		type: EmbedTypes[parsed.type],
	});

	return embed;
};

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
	if (url.protocol !== "https:")
		throw new EmbedGenerationError(`Unsupported protocol ${url.protocol}`);

	// first check if it's in the registry
	// some sites, like youtube, don't follow the discovery part of the spec
	const registry = findProviderInRegistry(url);
	if (registry) return registry;

	const resp = await fetch(url);

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
		version: z.literal("1.0").optional(), // not optional per spec...
		title: z.string().optional(),
		author_name: z.string().optional(),
		author_url: z.string().optional(),
		provider_name: z.string().optional(),
		provider_url: z.string().optional(),
		cache_age: z.number().optional(),
		thumbnail_url: z.string().optional(),
		thumbnail_width: z.number().optional(),
		thumbnail_height: z.number().optional(),
	})
	.and(
		z.union([
			z.object({
				type: z.literal("link"),
			}),
			z.object({
				type: z.literal("photo"),
				url: z.string().url(),
				width: z.number().min(1),
				height: z.number().min(1),
			}),
			z.object({
				type: z.literal("video"),
				html: z.string(),
				width: z.number().min(1),
				height: z.number().min(1),
			}),
			z.object({
				type: z.literal("rich"),
				html: z.string(),
				width: z.number(),
				height: z.number(),
			}),
		]),
	);
