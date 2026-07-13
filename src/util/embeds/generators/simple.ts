import { Embed, EmbedTypes } from "../../../entity/embed.js";
import { getImageMetadata, getImageProxyUrl } from "../index.js";
import type { EMBED_GENERATOR } from "./index.js";

export const simpleEmbedGenerator: EMBED_GENERATOR = async (url, head) => {
	const types = {
		"image/": EmbedTypes.photo,
		"video/": EmbedTypes.video,
	};

	const type =
		Object.entries(types).find(([key]) =>
			head.headers.get("Content-Type")?.startsWith(key),
		)?.[1] ?? EmbedTypes.link;

	const meta = await getImageMetadata(url);

	return Embed.create({
		target: url.href,
		type,

		[type === EmbedTypes.photo ? "images" : "videos"]: [
			{
				url: getImageProxyUrl(url, meta?.width ?? 1000, meta?.height ?? 1000).href,

				width: meta?.width,
				height: meta?.height,
			},
		],
	});
};
