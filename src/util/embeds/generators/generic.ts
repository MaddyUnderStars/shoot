import { Embed, EmbedTypes as EmbedType } from "../../../entity/embed";
import {
	fetchDom,
	findDomTag,
	findMeta,
	getImageMetadata,
	getImageProxyUrl,
	tryParseNumber,
} from "..";
import type { EMBED_GENERATOR } from ".";

export const genericEmbedGenerator: EMBED_GENERATOR = async (url) => {
	const doc = await fetchDom(url);

	// also check oembed?

	const ret = Embed.create({
		target: url.href,
		type: EmbedType.rich,

		title:
			findMeta(doc, "og:title") ?? findMeta(doc, "twitter:title") ?? findDomTag(doc, "title"),
		description: findMeta(doc, "og:description") ?? findMeta(doc, "description"),

		author_name:
			findMeta(doc, "article:author") ??
			findMeta(doc, "book:author") ??
			findMeta(doc, "twitter:creator"),

		provider_name: findMeta(doc, "og:site_name") ?? url.hostname,
		provider_url: url.origin,
	});

	const imageUrl =
		findMeta(doc, "og:image") ??
		findMeta(doc, "og:image:url") ??
		findMeta(doc, "og:image:secure_url");

	if (imageUrl) {
		const width = tryParseNumber(findMeta(doc, "og:image:width"));
		const height = tryParseNumber(findMeta(doc, "og:image:height"));

		const imageMeta = await getImageMetadata(new URL(imageUrl));

		const isThumbnail = findMeta(doc, "twitter:card") !== "summary_large_image";

		const embedImage = {
			url: getImageProxyUrl(
				new URL(imageUrl),
				Math.min(width ?? 1000, 1000),
				Math.min(height ?? 1000, 1000),
			).href,

			width: imageMeta?.width,
			height: imageMeta?.height,

			alt: findMeta(doc, "og:image:alt") ?? undefined,
		};

		if (isThumbnail) {
			ret.thumbnail = embedImage;
		} else {
			// TODO: support multiple images
			ret.images = [embedImage];
		}
	}

	return ret;
};
