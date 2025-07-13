import { Router } from "express";
import { z } from "zod";
import { PublicUser } from "../../../../entity/user";
import { ActorMention } from "../../../../util/activitypub/constants";
import { getOrFetchUser } from "../../../../util/entity/user";
import { route } from "../../../../util/route";

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
