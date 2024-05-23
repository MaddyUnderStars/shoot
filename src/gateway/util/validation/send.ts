import type {
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
import { Relationship } from "../../../entity/relationship";
import { PublicRole } from "../../../entity/role";

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

export type CHANNEL_CREATE = {
	type: "CHANNEL_CREATE";
	channel: PublicDmChannel | PublicGuildTextChannel;
};

export type GUILD_CREATE = {
	type: "GUILD_CREATE";
	guild: PublicGuild;
};

export type ROLE_CREATE = {
	type: "ROLE_CREATE";
	role: PublicRole;
};

export type MEMBER_JOIN = {
	type: "MEMBER_JOIN";
	member: PublicMember;
};

export type RELATIONSHIP_CREATE = {
	type: "RELATIONSHIP_CREATE";
	relationship: Relationship; // TODO: public relationship type
};

export type INVITE_CREATE = {
	type: "INVITE_CREATE";
	invite: PublicInvite;
};

/** Sent by gateway after a user has been authenticated with IDENTIFY */
export type READY = {
	type: "READY";
	user: PrivateUser;
	session: PrivateSession;
	channels: Array<PublicChannel>;
	guilds: Array<PublicGuild>;
};

export type HEARTBEAT_ACK = {
	// The expected sequence number
	type: "HEARTBEAT_ACK";
};

export type GATEWAY_EVENT =
	| MESSAGE_CREATE
	| CHANNEL_CREATE
	| GUILD_CREATE
	| ROLE_CREATE
	| MEMBER_JOIN
	| RELATIONSHIP_CREATE
	| INVITE_CREATE
	| READY
	| HEARTBEAT_ACK;
