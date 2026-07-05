import { Router } from "express";
import { route } from "../../../../../util/route";
import z from "zod";
import { ActorMention } from "../../../../../util/activitypub/constants";
import { getOrFetchGuild } from "../../../../../util/entity/guild";
import { PERMISSION } from "../../../../../util/permission";
import { Member, PublicMember } from "../../../../../entity/member";
import { getDatabase } from "../../../../../util/database";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				guild_id: ActorMention,
			}),
			query: z.object({
				page: z.coerce.number().min(0).default(0),
				limit: z.coerce.number().max(50).min(1).default(50),
				order: z.literal("ASC").or(z.literal("DESC")).default("DESC"),

				// queries
				username: z.string().optional(),
				role: z.uuid().optional(),
			}),
			response: PublicMember.array(),
		},
		async (req, res) => {
			const guild = await getOrFetchGuild(req.params.guild_id);

			await guild.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

			const query = getDatabase()
				.getRepository(Member)
				.createQueryBuilder("members")
				.limit(req.query.limit)
				.skip(req.query.limit * req.query.page)
				.leftJoinAndSelect("members.roles", "roles")
				.leftJoinAndSelect("members.user", "user")
				.leftJoin("roles.guild", "guild")
				.orderBy("roles.position", req.query.order)
				.where("guild.id = :guild_id", { guild_id: guild.id });

			if (req.query.username) {
				query.andWhere("to_tsvector(user.name) @@ to_tsquery(:username)", {
					username: req.query.username,
				});
			}

			if (req.query.role) {
				query.andWhere("roles.id = :role_id", { role_id: req.query.role });
			}

			const members = await query.getMany();

			return res.json(members.map((x) => x.toPublic()));
		},
	),
);

export default router;
