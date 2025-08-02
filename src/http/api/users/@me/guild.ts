import { Router } from "express";
import { z } from "zod";
import { Guild, PublicGuild } from "../../../../entity/guild";
import { Member } from "../../../../entity/member";
import { splitQualifiedMention } from "../../../../util/activitypub/util";
import { getDatabase } from "../../../../util/database";
import { getGuilds } from "../../../../util/entity/guild";
import { emitGatewayEvent } from "../../../../util/events";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

// Get list of guilds
router.get(
	"/",
	route(
		{
			response: PublicGuild.array(),
		},
		async (req, res) => {
			const user_id = req.user.id;

			const guilds = await getGuilds(user_id);

			return res.json(guilds.map((x) => x.toPublic()));
		},
	),
);

/** Leave guild */
router.delete(
	"/:guild_id",
	route({ params: z.object({ guild_id: z.string() }) }, async (req, res) => {
		const mention = splitQualifiedMention(req.params.guild_id);

		/*
		delete from "guild_members"
		where "userId" = 'user id' and
		"id" in (
			select "guildMembersId" from "roles_members_guild_members"
			where "rolesId" = 'guild id'
		)
		*/

		const deleted = await getDatabase()
			.createQueryBuilder()
			.delete()
			.from(Member)
			.where(
				(qb) => {
					const sub = qb.connection
						.createQueryBuilder()
						.subQuery()
						.select("roles.guildMembersId")
						.from("roles_members_guild_members", "roles")
						.where("roles.rolesId = :guild_id")
						.getQuery();

					return `guild_members.id IN ${sub}`;
				},
				{ guild_id: mention.user },
			)
			.andWhere('"guild_members"."userId" = :user_id', {
				user_id: req.user.id,
			})
			.output("guild_members.id")
			.execute();

		if (deleted.affected) {
			emitGatewayEvent(Guild.create({ id: req.params.guild_id }), {
				type: "MEMBER_LEAVE",
				guild: `${mention.user}@${mention.domain}`,
				user: req.user.mention,
			});
		}

		return res.sendStatus(200);
	}),
);

export default router;
