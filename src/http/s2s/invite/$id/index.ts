import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../../entity/invite.js";
import { buildAPGuildInvite } from "../../../../util/activitypub/transformers/invite.js";
import { addContext } from "../../../../util/activitypub/util.js";
import { route } from "../../../../util/route.js";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ invite_id: z.string() }) }, async (req, res) => {
		const { invite_id } = req.params;

		const invite = await Invite.findOneOrFail({
			where: {
				code: invite_id,
			},
			relations: {
				guild: {
					owner: true,
				},
			},
		});

		return res.json(addContext(buildAPGuildInvite(invite)));
	}),
);

export default router;
