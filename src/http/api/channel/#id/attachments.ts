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
					size: z.number(), // bytes
					name: z.string(),
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

				const { endpoint, hash } = await createUploadEndpoint(
					channel.id,
					file.name,
					file.size,
				);

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
