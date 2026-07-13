import { Router } from "express";
import { z } from "zod";
import { PublicGuild } from "../../../entity/guild.js";
import { createGuild } from "../../../util/entity/guild.js";
import { route } from "../../../util/route.js";

const router = Router({ mergeParams: true });

const GuildCreate = z.object({
	name: z.string().min(1),
});

router.post(
	"/",
	route(
		{
			body: GuildCreate,
			response: PublicGuild,
		},
		async (req, res) => {
			const { name } = req.body;

			const owner = req.user;

			const guild = await createGuild(name, owner);

			return res.json(guild.toPublic());
		},
	),
);

export default router;
