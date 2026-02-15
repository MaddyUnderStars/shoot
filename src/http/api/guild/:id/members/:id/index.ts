import { Router } from "express";
import { In } from "typeorm";
import z from "zod";
import { Role } from "../../../../../../entity/role";
import { ActorMention } from "../../../../../../util/activitypub/constants";
import { getOrFetchGuild } from "../../../../../../util/entity/guild";
import { getMember } from "../../../../../../util/entity/member";
import { getOrFetchUser } from "../../../../../../util/entity/user";
import { HttpError } from "../../../../../../util/httperror";
import { PERMISSION } from "../../../../../../util/permission";
import { route } from "../../../../../../util/route";

const router = Router({ mergeParams: true });

const params = z.object({
	guild_id: ActorMention,
	user_id: ActorMention,
});

router.patch(
	"/",
	route(
		{
			params,
			body: z
				.object({
					nickname: z.string().nullable(),
					roles: z.string().array(),
				})
				.partial(),
		},
		async (req, res) => {
			const guild = await getOrFetchGuild(req.params.guild_id);

			const hasManageMembers = await guild.checkPermission(
				req.user,
				PERMISSION.MANAGE_MEMBERS,
			);

			const user = await getOrFetchUser(req.params.user_id);

			// can edit some properties of self without this permission
			if (!hasManageMembers && req.user.id !== user.id)
				throw new HttpError("Missing permission", 400);

			const member = await getMember(user, guild);

			if (!member) throw new HttpError("Member could not be found", 404);

			const body = req.body;

			if (body.nickname) member.nickname = body.nickname;

			if (body.roles) {
				const roleIds = new Set(req.body.roles);

				// cannot edit roles without this permission
				if (!hasManageMembers)
					throw new HttpError("Missing permission", 400);

				if (
					(await Role.count({
						where: {
							guild: { id: guild.id },
							id: In([...roleIds]),
						},
					})) !== roleIds.size
				)
					throw new HttpError(
						"One of the specified roles could not be found",
						404,
					);

				member.roles = [...roleIds].map((x) => Role.create({ id: x }));
			}

			await member.save();

			return res.json(member.toPublic());
		},
	),
);

export default router;
