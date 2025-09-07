import { Embed, EmbedTypes as EmbedType } from "../../../entity/embed";
import { fetchDom, findDomTag, findMeta, tryParseNumber } from "..";
import type { EMBED_GENERATOR } from ".";

export const genericEmbedGenerator: EMBED_GENERATOR = async (url) => {
	const doc = await fetchDom(url);

	const image_url =
		findMeta(doc, "og:image") ??
		findMeta(doc, "og:image:url") ??
		findMeta(doc, "og:image:secure_url");

	return Embed.create({
		target: url.href,
		type: EmbedType.rich,

		title: findMeta(doc, "og:title"),
		description: findMeta(doc, "og:description"),

		author_name:
			findMeta(doc, "article:author") ?? findMeta(doc, "book:author"),

		provider_name:
			findMeta(doc, "og:site_name") ?? findDomTag(doc, "title"),
		provider_url: url.origin,

		images: image_url
			? [
					{
						url: image_url,

						// todo: use imagor to find these as fallback
						width: tryParseNumber(findMeta(doc, "og:image:width")),
						height: tryParseNumber(
							findMeta(doc, "og:image:height"),
						),

						alt: findMeta(doc, "og:image:alt") ?? undefined,
					},
				]
			: [],
	});
};
