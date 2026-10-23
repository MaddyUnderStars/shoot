import { Router } from "express";
import z from "zod";
import { PublicRole, Role, ZodPermission } from "../../../../entity/role.js";
import { isMemberOfGuildThrow } from "../../../../util/entity/member.js";
import { emitGatewayEvent } from "../../../../util/events.js";
import { HttpError } from "../../../../util/httperror.js";
import { PERMISSION } from "../../../../util/permission.js";
import { route } from "../../../../util/route.js";

const router = Router({ mergeParams: true });

const params = z.object({ role_id: z.string() });

router.get(
	"/",
	route({ params, response: PublicRole }, async (req, res) => {
		const role = await Role.findOneOrFail({
			where: { id: req.params.role_id },
			relations: { guild: true },
		});

		await isMemberOfGuildThrow(role.guild.mention, req.user);

		return res.json(role.toPublic());
	}),
);

router.patch(
	"/",
	route(
		{
			params,
			response: PublicRole,
			body: z
				.object({
					name: z.string(),
					allow: ZodPermission.array(),
					deny: ZodPermission.array(),
					position: z.number(),
				})
				.partial(),
		},
		async (req, res) => {
			const role = await Role.findOneOrFail({
				where: { id: req.params.role_id },
				relations: { guild: { owner: true } },
			});

			await role.guild.throwPermission(req.user, PERMISSION.MANAGE_GUILD);

			// not allowed to change these properties of default role
			if (role.id === role.guild.id) {
				delete req.body.name;
				delete req.body.position;
			}

			if (req.body.name) role.name = req.body.name;
			if (req.body.position !== undefined) role.position = req.body.position;
			if (req.body.allow !== undefined) role.allow = req.body.allow;
			if (req.body.deny !== undefined) role.deny = req.body.deny;

			await role.save();

			emitGatewayEvent(role.guild, {
				type: "ROLE_UPDATE",
				role: role.toPublic(),
			});

			return res.json(role.toPublic());
		},
	),
);

router.delete(
	"/",
	route({ params }, async (req, res) => {
		const role = await Role.findOneOrFail({
			where: { id: req.params.role_id },
			relations: { guild: { owner: true } },
		});

		await role.guild.throwPermission(req.user, PERMISSION.MANAGE_GUILD);

		if (role.id === role.guild.id) throw new HttpError("Cannot remove default role", 400);

		await Role.delete({ id: role.id });

		emitGatewayEvent(role.guild, {
			type: "ROLE_DELETE",
			guild_id: role.guild.mention,
			role_id: role.id,
		});

		return res.sendStatus(204);
	}),
);

export default router;
