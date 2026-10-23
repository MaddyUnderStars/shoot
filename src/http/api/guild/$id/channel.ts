import { Router } from "express";
import { z } from "zod";
import { PublicGuildTextChannel } from "../../../../entity/textChannel.js";
import { ActorMention } from "../../../../util/activitypub/constants.js";
import { createGuildTextChannel } from "../../../../util/entity/channel.js";
import { getOrFetchGuild } from "../../../../util/entity/guild.js";
import { PERMISSION } from "../../../../util/permission.js";
import { route } from "../../../../util/route.js";

const router = Router({ mergeParams: true });

router.post(
	"/",
	route(
		{
			params: z.object({ guild_id: ActorMention }),
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
