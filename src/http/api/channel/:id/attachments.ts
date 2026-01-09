import { Router } from "express";
import { z } from "zod";
import { ActorMention } from "../../../../util/activitypub/constants";
import { config } from "../../../../util/config";
import { getOrFetchChannel } from "../../../../util/entity/channel";
import { HttpError } from "../../../../util/httperror";
import { PERMISSION } from "../../../../util/permission";
import { route } from "../../../../util/route";
import { createUploadEndpoint, getFileStream } from "../../../../util/storage";

const router = Router({ mergeParams: true });

const AttachmentsResponse = z.array(
	z.object({
		id: z.string(),
		hash: z.string(),
		url: z.string(),
	}),
);

// NOTE: This route DOES NOT require authentication.
// The POST route will simply fail if you do not have `req.user`, thus it is still protected ish
// But the GET route is free to use for all.
// This ended up becoming a problem for Discord, so it may change in the future.

router.post(
	"/",
	route(
		{
			params: z.object({
				channel_id: ActorMention,
			}),
			body: z
				.array(
					z.object({
						id: z
							.string()
							.describe(
								"Client defined ID for cross referencing attachments to output endpoints. Can be any value. Must be unique",
							),

						name: z.string().describe("User defined file name"),

						md5: z.string(), // md5 of the uploaded image

						mime: z.string(), // mime type
						size: z.number().describe("Size in bytes"), // bytes

						// we trust the client here, but only because we require the md5 hash and size
						// that should be good enough
						// I'm sure it'll bite me later, though
						width: z.number().optional(),
						height: z.number().optional(),
					}),
				)
				.refine(
					(d) => new Set(d.map((x) => x.id)).size === d.length,
					"Attachment IDs must be unique",
				),
			response: AttachmentsResponse,
		},
		async (req, res) => {
			if (!req.user) throw new HttpError("Unauthorised", 401);

			const channel = await getOrFetchChannel(req.params.channel_id);

			await channel.throwPermission(req.user, PERMISSION.UPLOAD);

			const ret: z.infer<typeof AttachmentsResponse> = [];
			for (const file of req.body) {
				if (file.size > config().storage.max_file_size)
					throw new HttpError(
						`${file.name} exceeds maximum size (${config().storage.max_file_size})`,
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

				ret.push({ hash, url: endpoint, id: file.id });
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
				channel_id: ActorMention,
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
