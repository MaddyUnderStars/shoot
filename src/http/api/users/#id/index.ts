import { Response, Router } from "express";
import { z } from "zod";
import { PublicUser } from "../../../../entity";
import { addContext, getOrCreateUser, route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				user_id: z.string(),
			}),
		},
		async (req, res: Response<PublicUser>) => {
			const { user_id } = req.params;

			const user = await getOrCreateUser(user_id);

			//@ts-ignore
			return res.json(addContext(user.toPublic()));
		},
	),
);

export default router;
