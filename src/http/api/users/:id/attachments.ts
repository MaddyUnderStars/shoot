import { Router } from "express";
import { route } from "../../../../util/route.js";
import z from "zod";
import { User } from "../../../../entity/user.js";
import { getFileStream, getFileUrl } from "../../../../util/storage/index.js";
import { config } from "../../../../util/config.js";

const router = Router({ mergeParams: true });

router.get(
	"/:hash",
	route(
		{
			params: z.object({
				hash: z.string(),
				user_id: z.string(),
			}),
		},
		async (req, res) => {
			if (config().storage.s3.enabled) {
				return res.redirect(
					await getFileUrl(User.create({ id: req.params.user_id }), req.params.hash),
				);
			}

			const file = await getFileStream(
				User.create({ id: req.params.user_id }),
				req.params.hash,
			);

			if (!file) {
				res.sendStatus(404);
				return;
			}

			file.on("error", () => res.sendStatus(404)).pipe(res);
		},
	),
);

export default router;
