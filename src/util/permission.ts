// Permissions regarding actions within a channel.

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
