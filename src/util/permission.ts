// Permissions regarding actions within a channel.

import { Guild, User } from "../entity";

// TODO: allow/deny rather than just allow
// can't use enums
// could use a separate column for each permission, but is that a good idea?

// Stored within the role or channel overwrites
export enum PERMISSION {
	NONE = 0, // no permissions
	OWNER = 1, // all permissions + delete
	ADMIN, // all permissions

	SEND_MESSAGES, // can send messages in this channel

	MANAGE_CHANNELS, // can modify, delete, add channels in this guild
	VIEW_CHANNEL,

	MANAGE_GUILD, // can modify this guild

	MANAGE_INVITES, // can modify or delete invites
	CREATE_INVITE, // can invite people to this channel
}

export const DefaultPermissions: PERMISSION[] = [
	PERMISSION.SEND_MESSAGES,
	PERMISSION.VIEW_CHANNEL,
	PERMISSION.CREATE_INVITE,
];

export const checkPermission = (
	user: User,
	guild: Guild,
	permission: PERMISSION | PERMISSION[],
) => {
	permission = Array.isArray(permission) ? permission : [permission];

	if (guild.owner.id == user.id) return true;

	const roles = guild.roles
		// every role our user is a member of
		.filter((x) => x.members.find((x) => x.user.id == user.id));

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
