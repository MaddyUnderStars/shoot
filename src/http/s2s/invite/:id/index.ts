import { Router } from "express";
import { z } from "zod";
import { Invite } from "../../../../entity/invite";
import { buildAPGuildInvite } from "../../../../util/activitypub/transformers/invite";
import { addContext } from "../../../../util/activitypub/util";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ invite_id: z.string() }) }, async (req, res) => {
		const { invite_id } = req.params;

		const invite = await Invite.findOneOrFail({
			where: {
				code: invite_id,
			},
			relations: ["guild", "guild.owner"],
		});

		return res.json(addContext(buildAPGuildInvite(invite)));
	}),
);

export default router;
