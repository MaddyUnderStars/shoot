import { Router } from "express";
import { z } from "zod";
import { ActorMention } from "../../../../util/activitypub/constants.js";
import { config } from "../../../../util/config.js";
import { getChannel, getOrFetchChannel } from "../../../../util/entity/channel.js";
import { HttpError } from "../../../../util/httperror.js";
import { PERMISSION } from "../../../../util/permission.js";
import { route } from "../../../../util/route.js";
import { createUploadEndpoint, getFileStream, getFileUrl } from "../../../../util/storage/index.js";
import { AttachmentInitRequest } from "../../../../entity/attachment.js";

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
				.array(AttachmentInitRequest)
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
					target: channel,

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
			const channel = await getChannel(req.params.channel_id);

			if (!channel) throw new HttpError("Channel not found", 404);

			if (config().storage.s3.enabled) {
				return res.redirect(await getFileUrl(channel, req.params.hash));
			}

			const file = await getFileStream(channel, req.params.hash);

			if (!file) {
				res.sendStatus(404);
				return;
			}

			file.on("error", () => res.sendStatus(404)).pipe(res);
		},
	),
);

export default router;
