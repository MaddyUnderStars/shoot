import { Router } from "express";
import { z } from "zod";
import { PublicUser } from "../../../../entity";
import { getOrFetchUser, route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				user_id: z.string(),
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
