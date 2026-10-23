import { Router } from "express";
import { route } from "../../../../../util/route.js";
import z from "zod";
import { ActorMention } from "../../../../../util/activitypub/constants.js";
import { getOrFetchGuild } from "../../../../../util/entity/guild.js";
import { PERMISSION } from "../../../../../util/permission.js";
import { Member, PublicMember } from "../../../../../entity/member.js";
import { getDatabase } from "../../../../../util/database.js";

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
			response: z.object({
				members: PublicMember.array(),
				total: z.number(),
			}),
		},
		async (req, res) => {
			const guild = await getOrFetchGuild(req.params.guild_id);

			await guild.throwPermission(req.user, PERMISSION.VIEW_CHANNEL);

			const query = getDatabase()
				.getRepository(Member)
				.createQueryBuilder("members")
				.take(req.query.limit)
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
			const total = await query.getCount();

			return res.json({
				total,
				members: members.map((x) => x.toPublic()),
			});
		},
	),
);

export default router;
