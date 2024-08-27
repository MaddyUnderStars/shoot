// Permissions regarding actions within a channel.

import { type Guild, Member, Role, type User } from "../entity";
import { getDatabase } from "./database";

// Stored within the role or channel overwrites
export enum PERMISSION {
	NONE = 0, // no permissions
	OWNER = 1, // all permissions + delete
	ADMIN = 2, // all permissions

	SEND_MESSAGES = 3, // can send messages in this channel

	MANAGE_CHANNELS = 4, // can modify, delete, add channels in this guild
	VIEW_CHANNEL = 5, // can view this channel.
	CALL_CHANNEL = 6, // can start or join this channel's voice call

	MANAGE_GUILD = 7, // can modify this guild

	MANAGE_INVITES = 8, // can modify or delete invites
	CREATE_INVITE = 9, // can invite people to this channel
}

export const DefaultPermissions: PERMISSION[] = [
	PERMISSION.SEND_MESSAGES,
	PERMISSION.VIEW_CHANNEL,
	PERMISSION.CALL_CHANNEL,
	PERMISSION.CREATE_INVITE,
];

export const checkPermission = async (
	user: User,
	guild: Guild,
	permission: PERMISSION | PERMISSION[],
) => {
	permission = Array.isArray(permission) ? permission : [permission];

	if (guild.owner.id === user.id) return true;

	// const roles = guild.roles
	// 	// every role our user is a member of
	// 	.filter((x) => x.members.find((x) => x.user.id === user.id))
	// 	.sort((a, b) => a.position - b.position);

	/*
			const roles = (
			await Role.find({
					where: {
						members: {
							user: {
								id: user.id,
							},
						},
						guild: {
							id: guild.id,
						},
					},
				})
				).sort((a, b) => a.position - b.position);
	 */

	// TODO: making this function async may have consequences
	const roles = (
		await getDatabase()
			.getRepository(Role)
			.createQueryBuilder("roles")
			.leftJoin("roles.members", "members")
			.where("roles.guildId = :guild_id", { guild_id: guild.id })
			.andWhere((qb) => {
				const sub = qb
					.subQuery()
					.select("id")
					.from(Member, "members")
					.where("members.userId = :user_id", { user_id: user.id })
					.getQuery();

				qb.where(`roles_members.guildMembersId in ${sub}`);
			})
			.getMany()
	).sort((a, b) => a.position - b.position);

	let allowed = false;
	// for every role in order
	for (const role of roles) {
		// if this role includes admin perm, and we aren't requesting owner perms, we're good
		if (
			role.allow.includes(PERMISSION.ADMIN) &&
			!permission.includes(PERMISSION.OWNER)
		)
			return true;

		// if every requested permission is allowed in this role, we're good
		if (permission.every((x) => role.allow.includes(x))) allowed = true;
		// if one of them is denied, we're not good
		if (permission.find((x) => role.deny.includes(x))) allowed = false;
		// if it's neutral, we just use the last set value
	}

	return allowed;
};
