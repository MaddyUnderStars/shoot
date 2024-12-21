import { Router } from "express";
import { z } from "zod";
import {
	HttpError,
	PERMISSION,
	config,
	getOrFetchChannel,
	route,
} from "../../../../util";
import { createUploadEndpoint, getFileStream } from "../../../../util/storage";

const router = Router({ mergeParams: true });

const AttachmentsResponse = z.array(
	z.object({
		hash: z.string(),
		url: z.string(),
	}),
);

router.post(
	"/",
	route(
		{
			params: z.object({
				channel_id: z.string(),
			}),
			body: z.array(
				z.object({
					name: z.string(),

					md5: z.string(), // md5 of the uploaded image

					mime: z.string(), // mime type
					size: z.number(), // bytes

					// we trust the client here, but only because we require the md5 hash and size
					// that should be good enough
					// I'm sure it'll bite me later, though
					width: z.number().optional(),
					height: z.number().optional(),
				}),
			),
			response: AttachmentsResponse,
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			await channel.throwPermission(req.user, PERMISSION.UPLOAD);

			const ret: z.infer<typeof AttachmentsResponse> = [];
			for (const file of req.body) {
				if (file.size > config.storage.max_file_size)
					throw new HttpError(
						`${file.name} exceeds maximum size (${config.storage.max_file_size})`,
					);

				if (
					(file.mime.toLowerCase().startsWith("image") ||
						file.mime.toLowerCase().startsWith("video")) &&
					(!file.width || !file.height)
				)
					throw new HttpError(
						`${file.name} is image or video but does not provide width/height`,
					);

				const { endpoint, hash } = await createUploadEndpoint({
					channel_id: channel.id,

					...file,
				});

				ret.push({ hash, url: endpoint });
			}

			res.json(ret);
		},
	),
);

router.get(
	"/:hash",
	route(
		{
			params: z.object({
				hash: z.string(),
				channel_id: z.string(),
			}),
		},
		async (req, res) => {
			const channel = await getOrFetchChannel(req.params.channel_id);

			// await channel.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

			const file = await getFileStream(channel.id, req.params.hash);

			if (!file) {
				res.sendStatus(404);
				return;
			}

			file.pipe(res);
		},
	),
);

export default router;
