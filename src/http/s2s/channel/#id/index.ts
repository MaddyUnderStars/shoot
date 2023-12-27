import { Router } from "express";
import { z } from "zod";
import { Channel } from "../../../../entity/channel";
import { addContext, route } from "../../../../util";
import { buildAPGroup } from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ channel_id: z.string() }) }, async (req, res) => {
		const { channel_id } = req.params;

		const channel = await Channel.findOneOrFail({
			where: { id: channel_id },
		});

		return res.json(addContext(buildAPGroup(channel)));
	}),
);

export default router;