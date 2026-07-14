import { APPerson } from "@shootpub/activitypub-types/actors/person";
import type { Guild } from "../../entity/guild.js";
import { Member } from "../../entity/member.js";
import type { User } from "../../entity/user.js";
import type { ActorMention } from "../activitypub/constants.js";
import { resolveId } from "../activitypub/resolve.js";
import { splitQualifiedMention } from "../activitypub/util.js";
import { getDatabase } from "../database.js";
import { HttpError } from "../httperror.js";
import { getOrFetchUser } from "./user.js";

export const getOrFetchMember = async (lookup: ActorMention | URL | APPerson) => {
	const mention = splitQualifiedMention(resolveId(lookup));

	const member = await Member.findOne({
		where: {
			user: {
				name: mention.id,
				domain: mention.domain,
			},
		},
	});

	if (!member) {
		const user = await getOrFetchUser(lookup);
		await user.save();
		return Member.create({
			user,
			roles: [], // assigned later
		});
	}

	return member;
};

export const getMember = async (user: User, guild: Guild) =>
	getDatabase()
		.createQueryBuilder(Member, "guild_members")
		.where(
			(qb) => {
				const sub = qb
					.subQuery()
					.select("roles.guildMembersId")
					.from("roles_members_guild_members", "roles")
					.where("roles.rolesId = :guild_id")
					.getQuery();

				return `guild_members.id IN ${sub}`;
			},
			{ guild_id: guild.id },
		)
		.andWhere('"guild_members"."userId" = :user_id', {
			user_id: user.id,
		})
		.leftJoinAndSelect("guild_members.user", "user")
		.leftJoinAndSelect("guild_members.roles", "roles")
		.getOne();

export const isMemberOfGuildThrow = async (guild_id: ActorMention, user: User) => {
	if (!(await isMemberOfGuild(guild_id, user))) throw new HttpError("Missing permission", 404);
};

export const isMemberOfGuild = async (guild_id: ActorMention, user: User) => {
	const guild = splitQualifiedMention(guild_id);

	return (
		(await Member.count({
			where: {
				roles: {
					guild: [{ remote_address: guild_id }, { id: guild.id, domain: guild.domain }],
				},
				user: { id: user.id },
			},
		})) !== 0
	);
};
