import { Router } from "express";
import z from "zod";
import { PublicRole, Role, ZodPermission } from "../../../../entity/role.js";
import { ActorMention } from "../../../../util/activitypub/constants.js";
import { getOrFetchGuild } from "../../../../util/entity/guild.js";
import { updateRoleOrdering } from "../../../../util/entity/role.js";
import { PERMISSION } from "../../../../util/permission.js";
import { route } from "../../../../util/route.js";
import { emitGatewayEvent } from "../../../../util/events.js";

const router = Router({ mergeParams: true });

const params = z.object({
	guild_id: ActorMention,
});

router.post(
	"/",
	route(
		{
			params,
			body: z.object({
				name: z.string(),
				allow: ZodPermission.array().default([PERMISSION.NONE]),
				deny: ZodPermission.array().default([PERMISSION.NONE]),
				position: z.number().optional(),
			}),
			response: PublicRole,
		},
		async (req, res) => {
			const guild = await getOrFetchGuild(req.params.guild_id);

			await guild.throwPermission(req.user, PERMISSION.MANAGE_GUILD);

			// TODO: get my highest role, and disallow moving roles above it
			// unless I have admin

			const role = await Role.create({
				guild,
				name: req.body.name,
				allow: req.body.allow,
				deny: req.body.deny,
				position:
					req.body.position ?? (await Role.count({ where: { guild: { id: guild.id } } })),
			}).save();

			await updateRoleOrdering(guild.id);

			emitGatewayEvent(guild, {
				type: "ROLE_CREATE",
				role: role.toPublic(),
			});

			return res.json(role.toPublic());
		},
	),
);

export default router;
