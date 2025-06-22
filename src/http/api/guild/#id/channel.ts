import { Router } from "express";
import { z } from "zod";
import { PublicGuildTextChannel } from "../../../../entity/textChannel";
import { createGuildTextChannel } from "../../../../util/entity/channel";
import { getOrFetchGuild } from "../../../../util/entity/guild";
import { PERMISSION } from "../../../../util/permission";
import { route } from "../../../../util/route";

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
