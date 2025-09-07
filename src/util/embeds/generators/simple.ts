import { Embed, EmbedTypes } from "../../../entity/embed";
import type { EMBED_GENERATOR } from ".";

export const simpleEmbedGenerator: EMBED_GENERATOR = async (url, head) => {
	const types = {
		"image/*": EmbedTypes.photo,
		"video/*": EmbedTypes.video,
	};

	const type =
		Object.entries(types).find(([key]) =>
			head.headers.get("Content-Type")?.startsWith(key),
		)?.[1] ?? EmbedTypes.link;

	return Embed.create({
		target: url.href,
		type,

		[type === EmbedTypes.photo ? "images" : "videos"]: [
			{
				url: url.href,
				// TODO: width, height
			},
		],
	});
};
