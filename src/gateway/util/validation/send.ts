import type {
	PrivateRelationship,
	PrivateSession,
	PrivateUser,
	PublicChannel,
	PublicDmChannel,
	PublicGuild,
	PublicGuildTextChannel,
	PublicInvite,
	PublicMember,
	PublicMessage,
} from "../../../entity";
import type { PublicRole } from "../../../entity/role";

export type GATEWAY_PAYLOAD = {
	/**
	 * The sequence number of this payload. Increments for each sent payload.
	 */
	// s: number;

	/**
	 * The payload type
	 */
	t: GATEWAY_EVENT["type"];

	/**
	 * The payload for this event
	 */
	d: Omit<GATEWAY_EVENT, "type">;
};

export type MESSAGE_CREATE = {
	type: "MESSAGE_CREATE";
	message: PublicMessage;
};

export type MESSAGE_UPDATE = {
	type: "MESSAGE_UPDATE";
	message: Partial<PublicMessage>;
};

export type CHANNEL_CREATE = {
	type: "CHANNEL_CREATE";
	channel: PublicDmChannel | PublicGuildTextChannel;
};

export type CHANNEL_DELETE = {
	type: "CHANNEL_DELETE";
	channel_id: string;
	guild_id?: string;
};

export type MEDIA_TOKEN_RECEIVED = {
	type: "MEDIA_TOKEN_RECEIVED";
	token: string;
	endpoint: string;
};

export type GUILD_CREATE = {
	type: "GUILD_CREATE";
	guild: PublicGuild;
};

export type ROLE_CREATE = {
	type: "ROLE_CREATE";
	role: PublicRole;
};

export type ROLE_MEMBER_ADD = {
	type: "ROLE_MEMBER_ADD";
	role_id: string;
	member: PublicMember;
};

export type ROLE_MEMBER_LEAVE = {
	type: "ROLE_MEMBER_LEAVE";
	role_id: string;
	member_id: string;
};

export type MEMBER_LEAVE = {
	type: "MEMBER_LEAVE";
	member_id: string;
};

export type MEMBER_JOIN = {
	type: "MEMBER_JOIN";
	member: PublicMember;
};

export type RELATIONSHIP_CREATE = {
	type: "RELATIONSHIP_CREATE";
	relationship: PrivateRelationship; // TODO: public relationship type
};

export type RELATIONSHIP_DELETE = {
	type: "RELATIONSHIP_DELETE";
	user_id: string;
};

export type INVITE_CREATE = {
	type: "INVITE_CREATE";
	invite: PublicInvite;
};

export type MEMBERS_CHUNK = {
	type: "MEMBERS_CHUNK";
	/** Role UUID or member */
	items: Array<string | { member_id: string; name: string }>;
};

/** Sent by gateway after a user has been authenticated with IDENTIFY */
export type READY = {
	type: "READY";
	user: PrivateUser;
	session: PrivateSession;
	channels: Array<PublicChannel>;
	guilds: Array<PublicGuild>;
	relationships: Array<PrivateRelationship>;
};

export type HEARTBEAT_ACK = {
	// The expected sequence number
	type: "HEARTBEAT_ACK";
};

export type GATEWAY_EVENT =
	| MESSAGE_CREATE
	| MESSAGE_UPDATE
	| CHANNEL_CREATE
	| CHANNEL_DELETE
	| MEDIA_TOKEN_RECEIVED
	| GUILD_CREATE
	| ROLE_CREATE
	| ROLE_MEMBER_ADD
	| ROLE_MEMBER_LEAVE
	| MEMBER_JOIN
	| MEMBER_LEAVE
	| RELATIONSHIP_CREATE
	| RELATIONSHIP_DELETE
	| INVITE_CREATE
	| MEMBERS_CHUNK
	| READY
	| HEARTBEAT_ACK;
