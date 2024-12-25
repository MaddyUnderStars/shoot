// Permissions regarding actions within a channel.

import { type Guild, Member, Role, type User } from "../entity";
import { getDatabase } from "./database";

// Stored within the role or channel overwrites
export enum PERMISSION {
	/** no permissions */
	NONE = 0,

	/** all permissions + delete */
	OWNER = 1,

	/** all permissions */
	ADMIN = 2,

	/** can send messages in this channel */
	SEND_MESSAGES = 3,

	/** can modify, delete, add channels in this guild */
	MANAGE_CHANNELS = 4,

	/** can view this channel. */
	VIEW_CHANNEL = 5,

	/** can start or join this channel's voice call */
	CALL_CHANNEL = 6,

	/** can modify this guild */
	MANAGE_GUILD = 7,

	/** can modify or delete invites */
	MANAGE_INVITES = 8,

	/** can invite people to this channel */
	CREATE_INVITE = 9,

	/** can attach files to this channel */
	UPLOAD = 10,
}

export const DefaultPermissions: PERMISSION[] = [
	PERMISSION.SEND_MESSAGES,
	PERMISSION.VIEW_CHANNEL,
	PERMISSION.CALL_CHANNEL,
	PERMISSION.CREATE_INVITE,
	PERMISSION.CALL_CHANNEL,
	PERMISSION.UPLOAD,
];

export const checkPermission = async (
	user: User,
	guild: Guild,
	permission: PERMISSION | PERMISSION[],
) => {
	permission = Array.isArray(permission) ? permission : [permission];

	if (guild.owner.id === user.id) return true; // we're the owner, all perms
	if (permission.includes(PERMISSION.OWNER)) return false; // we're not owner, and requesting owner perms

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
		// this role has admin, allow it
		if (role.allow.includes(PERMISSION.ADMIN)) return true;

		// if every requested permission is allowed in this role, we're good
		if (permission.every((x) => role.allow.includes(x))) allowed = true;
		// if one of them is denied, we're not good
		if (permission.find((x) => role.deny.includes(x))) allowed = false;
		// if it's neutral, we just use the last set value
	}

	return allowed;
};
