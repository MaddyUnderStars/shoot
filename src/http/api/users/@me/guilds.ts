import { Router } from "express";
import { Guild, PublicGuild } from "../../../../entity";
import { route } from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			response: PublicGuild.array(),
		},
		async (req, res) => {
			const user_id = req.user.id;

			const guilds = await Guild.find({
				where: [
					{ owner: { id: user_id } },
					{ roles: { members: { id: user_id } } },
				],
			});

			return res.json(guilds.map((x) => x.toPublic()));
		},
	),
);

export default router;
