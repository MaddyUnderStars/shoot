import { Router } from "express";
import { PublicGuild } from "../../../../entity";
import { getGuilds, route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			response: PublicGuild.array(),
		},
		async (req, res) => {
			const user_id = req.user.id;

			const guilds = await getGuilds(user_id);

			return res.json(guilds.map((x) => x.toPublic()));
		},
	),
);

export default router;
