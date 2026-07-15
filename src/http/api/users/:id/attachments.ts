import { Router } from "express";
import { route } from "../../../../util/route.js";
import z from "zod";
import { getOrFetchUser } from "../../../../util/entity/user.js";
import { ActorMention } from "../../../../util/activitypub/constants.js";
import { getFileStream } from "../../../../util/storage/index.js";

const router = Router({ mergeParams: true });

router.get(
	"/:hash",
	route(
		{
			params: z.object({
				hash: z.string(),
				user_id: ActorMention,
			}),
		},
		async (req, res) => {
			const user = await getOrFetchUser(req.params.user_id);

			const file = await getFileStream(user, req.params.hash);

			if (!file) {
				res.sendStatus(404);
				return;
			}

			file.pipe(res);
		},
	),
);

export default router;
