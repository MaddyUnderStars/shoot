import { Router } from "express";
import { route } from "../../../../util/route.js";
import z from "zod";
import { AttachmentInitRequest } from "../../../../entity/attachment.js";
import { config } from "../../../../util/config.js";
import { HttpError } from "../../../../util/httperror.js";
import { createUploadEndpoint } from "../../../../util/storage/index.js";

const router = Router({ mergeParams: true });

const AttachmentsResponse = z.object({
	hash: z.string(),
	url: z.string(),
});

router.post(
	"/",
	route(
		{
			body: AttachmentInitRequest,
			response: AttachmentsResponse,
		},
		async (req, res) => {
			const file = req.body;

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

			const ret = await createUploadEndpoint({
				target: req.user,

				...file,
			});

			res.json({
				url: ret.endpoint,
				hash: ret.hash,
			});
		},
	),
);

export default router;
