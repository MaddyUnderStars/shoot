import { Router } from "express";
import { route } from "../../../../util/route.js";
import z from "zod";
import { AttachmentInitRequest, AttachmentsResponse } from "../../../../entity/attachment.js";
import { config } from "../../../../util/config.js";
import { HttpError } from "../../../../util/httperror.js";
import { createUploadEndpoint } from "../../../../util/storage/index.js";

const router = Router({ mergeParams: true });

router.post(
	"/",
	route(
		{
			body: AttachmentInitRequest,
			response: AttachmentsResponse,
		},
		async (req, res) => {
			const ret: z.infer<typeof AttachmentsResponse> = [];

			for (const file of req.body) {
				if (file.size > config().storage.max_file_size)
					throw new HttpError(
						`${file.name} exceeds maximum size (${config().storage.max_file_size})`,
					);

				if (!file.mime.toLowerCase().startsWith("image"))
					throw new HttpError("Only images are accepted for user profiles");

				if (file.mime.toLowerCase().startsWith("image") && (!file.width || !file.height))
					throw new HttpError(
						`${file.name} is image or video but does not provide width/height`,
					);

				const { endpoint, hash } = await createUploadEndpoint({
					target: req.user,

					...file,
				});

				ret.push({ hash, url: endpoint, id: file.id });
			}

			res.json(ret);
		},
	),
);

export default router;
