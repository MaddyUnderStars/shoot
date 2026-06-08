import { Router } from "express";
import { z } from "zod";
import { Member } from "../../../../../entity/member";
import { Role } from "../../../../../entity/role";
import { orderedCollectionHandler } from "../../../../../util/activitypub/orderedCollection";
import { buildAPActor } from "../../../../../util/activitypub/transformers/actor";
import { buildAPRole } from "../../../../../util/activitypub/transformers/role";
import { addContext } from "../../../../../util/activitypub/util";
import { getDatabase } from "../../../../../util/database";
import { route } from "../../../../../util/route";
import { makeInstanceUrl } from "../../../../../util/url";

const router = Router({ mergeParams: true });

router.get(
	"/:role_id",
	route({ params: z.object({ guild_id: z.string(), role_id: z.string() }) }, async (req, res) => {
		// if (req.actor instanceof User)
		// 	await isMemberOfGuildThrow(req.params.guild_id, req.actor);
		// else throw new APError("Missing permission", 400);
		const role = await Role.findOneOrFail({
			where: {
				guild: { id: req.params.guild_id },
				id: req.params.role_id,
			},
			relations: { guild: true },
		});

		return res.json(addContext(buildAPRole(role)));
	}),
);

router.get(
	"/:role_id/members",
	route(
		{
			query: z.object({
				before: z.string().optional(),
				after: z.string().optional(),
			}),
			params: z.object({
				role_id: z.string(),
				guild_id: z.string(),
			}),
		},
		async (req, res) =>
			res.json(
				await orderedCollectionHandler({
					id: makeInstanceUrl(
						`/guild/${req.params.guild_id}/role/${req.params.role_id}/members`,
					),
					before: req.query.before,
					after: req.query.after,
					convert: (x) => x.user.remote_address ?? buildAPActor(x.user),
					entity: Member,
					qb: getDatabase()
						.getRepository(Member)
						.createQueryBuilder("member")
						.leftJoin("member.roles", "role", "role.id = :role_id", {
							role_id: req.params.role_id,
						})
						.leftJoinAndSelect("member.user", "user")
						.where("role.guildId = :guild_id", {
							guild_id: req.params.guild_id,
						}),
				}),
			),
	),
);

export default router;
