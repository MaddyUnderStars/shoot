import { Router } from "express";
import z from "zod";
import { PublicRole, Role, ZodPermission } from "../../../../entity/role";
import { ActorMention } from "../../../../util/activitypub/constants";
import { getOrFetchGuild } from "../../../../util/entity/guild";
import { updateRoleOrdering } from "../../../../util/entity/role";
import { PERMISSION } from "../../../../util/permission";
import { route } from "../../../../util/route";

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
				name: req.body.name,
				allow: req.body.allow,
				deny: req.body.deny,
				position:
					req.body.position ??
					(await Role.count({ where: { guild: { id: guild.id } } })) +
						1,
			}).save();

			await updateRoleOrdering(guild.id);

			return res.json(role.toPublic());
		},
	),
);

export default router;
