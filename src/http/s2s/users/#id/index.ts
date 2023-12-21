import { Router } from "express";
import { z } from "zod";
import { User } from "../../../../entity";
import { addContext, route } from "../../../../util";
import { buildAPPerson } from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ user_id: z.string() }) }, async (req, res) => {
		const { user_id } = req.params;

		const user = await User.findOneOrFail({
			where: {
				username: user_id,
			},
		});

		return res.json(addContext(buildAPPerson(user)));
	}),
);

export default router;
