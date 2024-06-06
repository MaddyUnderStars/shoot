import { Router } from "express";
import { z } from "zod";
import { Invite, PublicGuild } from "../../../../entity";
import { PERMISSION, emitGatewayEvent, route } from "../../../../util";
import { getOrFetchGuild } from "../../../../util/entity/guild";
import { generateInviteCode } from "../../../../util/entity/invite";
import { isMemberOfGuildThrow } from "../../../../util/entity/member";

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

			await isMemberOfGuildThrow(guild_id, req.user);

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

			const guild = await getOrFetchGuild(guild_id);

			await guild.throwPermission(req.user, PERMISSION.CREATE_INVITE);

			const expires = expiry ? new Date(expiry) : undefined;

			const invite = await Invite.create({
				expires,

				code: await generateInviteCode(),
				guild: { id: guild.id },
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
