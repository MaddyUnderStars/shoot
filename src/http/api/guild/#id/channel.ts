import { Router } from "express";
import { z } from "zod";
import { PublicGuildTextChannel } from "../../../../entity";
import {
	PERMISSION,
	createGuildTextChannel,
	getOrFetchGuild,
	route,
} from "../../../../util";

const router = Router({ mergeParams: true });

router.post(
	"/",
	route(
		{
			params: z.object({ guild_id: z.string() }),
			body: z.object({ name: z.string() }),
			response: PublicGuildTextChannel,
		},
		async (req, res) => {
			const guild = await getOrFetchGuild(req.params.guild_id);

			await guild.throwPermission(req.user, PERMISSION.MANAGE_CHANNELS);

			const channel = await createGuildTextChannel(req.body.name, guild);

			res.json(channel.toPublic());
		},
	),
);

export default router;
