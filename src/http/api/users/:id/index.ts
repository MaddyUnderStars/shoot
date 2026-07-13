import { Router } from "express";
import { z } from "zod";
import { PublicUser } from "../../../../entity/user.js";
import { ActorMention } from "../../../../util/activitypub/constants.js";
import { getOrFetchUser } from "../../../../util/entity/user.js";
import { route } from "../../../../util/route.js";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				user_id: ActorMention,
			}),
			response: PublicUser,
		},
		async (req, res) => {
			const { user_id } = req.params;

			const user = await getOrFetchUser(user_id);

			return res.json(user.toPublic());
		},
	),
);

export default router;
