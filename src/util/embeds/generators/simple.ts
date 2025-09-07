import { Embed, EmbedTypes } from "../../../entity/embed";
import { getImageMetadata, getImageProxyUrl } from "..";
import type { EMBED_GENERATOR } from ".";

export const simpleEmbedGenerator: EMBED_GENERATOR = async (url, head) => {
	const types = {
		"image/": EmbedTypes.photo,
		"video/": EmbedTypes.video,
	};

	const type =
		Object.entries(types).find(([key]) =>
			head.headers.get("Content-Type")?.startsWith(key),
		)?.[1] ?? EmbedTypes.link;

	const meta = await getImageMetadata(url, 1000, 1000);

	return Embed.create({
		target: url.href,
		type,

		[type === EmbedTypes.photo ? "images" : "videos"]: [
			{
				url: getImageProxyUrl(url, meta.width, meta.height).href,

				width: meta.width,
				height: meta.height,
			},
		],
	});
};
