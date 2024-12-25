// Permissions regarding actions within a channel.

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
