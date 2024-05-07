import { Router } from "express";
import { z } from "zod";
import { PublicGuild } from "../../../../entity";
import { route } from "../../../../util";
import { getOrFetchGuild } from "../../../../util/entity/guild";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				guild_id: z.string(),
			}),
			response: PublicGuild,
		},
		async (req, res) => {
			const { guild_id } = req.params;

			const guild = await getOrFetchGuild(guild_id);

			return res.json(guild.toPublic());
		},
	),
);

export default router;
