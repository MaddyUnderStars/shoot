import { Router } from "express";
import { z } from "zod";
import { Guild, Invite, PublicGuild } from "../../../../entity";
import { APError, PERMISSION, emitGatewayEvent, route } from "../../../../util";
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

const GuildModifySchema: z.ZodType<Partial<Guild>> = z
	.object({
		name: z.string(),
		summary: z.string(),
	})
	.partial()
	.strict();

router.patch(
	"/",
	route(
		{
			params: z.object({ guild_id: z.string() }),
			body: GuildModifySchema,
		},
		async (req, res) => {
			const { guild_id } = req.params;

			const guild = await getOrFetchGuild(guild_id);

			await guild.throwPermission(req.user, [PERMISSION.MANAGE_GUILD]);

			if (guild.isRemote()) {
				// TODO: same with channel and message editing.
				// do we optimistically edit? or send the event, mark it as edited, and then confirm?
				// do we do both?

				throw new APError("TODO: federate guild modification");
			}

			await Guild.update({ id: guild.id }, req.body);

			emitGatewayEvent(guild.id, {
				type: "GUILD_UPDATE",
				guild: guild.toPublic(),
			});

			return res.sendStatus(204);
		},
	),
);

router.delete(
	"/",
	route({ params: z.object({ guild_id: z.string() }) }, async (req, res) => {
		const { guild_id } = req.params;

		const guild = await getOrFetchGuild(guild_id);

		await guild.throwPermission(req.user, PERMISSION.ADMIN);

		emitGatewayEvent(guild.id, {
			type: "GUILD_DELETE",
			guild_id: guild.id,
		});

		await guild.remove();

		return res.sendStatus(204);
	}),
);

router.post(
	"/invite",
	route(
		{
			params: z.object({ guild_id: z.string() }),
			body: z.object({ expiry: z.string().datetime().optional() }),
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
