import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../../entity";
import { buildAPGuildInvite, route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ invite_id: z.string() }) }, async (req, res) => {
		const { invite_id } = req.params;

		const invite = await Invite.findOneOrFail({
			where: {
				code: invite_id,
			},
		});

		return res.json(buildAPGuildInvite(invite));
	}),
);

export default router;
