import { Router } from "express";
import { z } from "zod";
import { Invite, PublicGuild } from "../../../../entity";
import {
	emitGatewayEvent,
	route,
	splitQualifiedMention,
} from "../../../../util";
import { getOrFetchGuild } from "../../../../util/entity/guild";
import { generateInviteCode } from "../../../../util/entity/invite";

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

router.post(
	"/invite",
	route(
		{
			params: z.object({ guild_id: z.string() }),
			body: z.object({ expiry: z.string().optional() }),
		},
		async (req, res) => {
			const { guild_id } = req.params;
			const { expiry } = req.body;

			const mention = splitQualifiedMention(guild_id);

			const expires = expiry ? new Date(expiry) : undefined;

			const invite = await Invite.create({
				expires,

				code: await generateInviteCode(),
				guild: { id: mention.user, domain: mention.domain },
			}).save();

			emitGatewayEvent(guild_id, {
				type: "INVITE_CREATE",
				invite: invite.toPublic(),
			});

			return res.json(invite.toPublic());
		},
	),
);

export default router;
