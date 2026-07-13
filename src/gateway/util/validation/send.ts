import type { PublicChannel } from "../../../entity/channel.js";
import type { PublicDmChannel } from "../../../entity/DMChannel.js";
import type { PublicGuild } from "../../../entity/guild.js";
import type { PublicInvite } from "../../../entity/invite.js";
import type { PublicMember } from "../../../entity/member.js";
import type { PublicMessage } from "../../../entity/message.js";
import type { PrivateRelationship } from "../../../entity/relationship.js";
import type { PublicRole } from "../../../entity/role.js";
import type { PrivateSession } from "../../../entity/session.js";
import type { PublicGuildTextChannel } from "../../../entity/textChannel.js";
import type { PrivateUser, PublicUser } from "../../../entity/user.js";
import type { ActorMention } from "../../../util/activitypub/constants.js";
import type { MembersChunkItem } from "../../handlers/members.js";

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
	message: Partial<PublicMessage> & Pick<PublicMessage, "id">;
};

export type MESSAGE_DELETE = {
	type: "MESSAGE_DELETE";
	message_id: string;
	channel: ActorMention;
};

export type CHANNEL_CREATE = {
	type: "CHANNEL_CREATE";
	channel: PublicDmChannel | PublicGuildTextChannel;
};

export type CHANNEL_UPDATE = {
	type: "CHANNEL_UPDATE";
	channel: Partial<PublicDmChannel | PublicGuildTextChannel>;
};

export type CHANNEL_DELETE = {
	type: "CHANNEL_DELETE";
	channel: ActorMention;
	guild?: ActorMention;
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

export type GUILD_UPDATE = {
	type: "GUILD_UPDATE";
	guild: Partial<PublicGuild>;
};

export type GUILD_DELETE = {
	type: "GUILD_DELETE";
	guild: ActorMention;
};

export type ROLE_CREATE = {
	type: "ROLE_CREATE";
	role: PublicRole;
};

export type ROLE_UPDATE = {
	type: "ROLE_UPDATE";
	role: PublicRole;
};

export type ROLE_DELETE = {
	type: "ROLE_DELETE";
	guild_id: ActorMention;
	role_id: string; // uuid
};

export type ROLE_MEMBER_ADD = {
	type: "ROLE_MEMBER_ADD";
	guild: ActorMention;
	role_id: string;
	member: PublicMember;
};

export type ROLE_MEMBER_LEAVE = {
	type: "ROLE_MEMBER_LEAVE";
	guild: ActorMention;
	role_id: string;
	member: ActorMention;
};

export type MEMBER_LEAVE = {
	type: "MEMBER_LEAVE";
	guild: ActorMention;
	user: ActorMention;
};

export type MEMBER_JOIN = {
	type: "MEMBER_JOIN";
	guild: ActorMention;
	member: PublicMember;
};

export type RELATIONSHIP_CREATE = {
	type: "RELATIONSHIP_CREATE";
	relationship: PrivateRelationship; // TODO: public relationship type
};

export type RELATIONSHIP_UPDATE = {
	type: "RELATIONSHIP_UPDATE";
	relationship: PrivateRelationship;
};

export type RELATIONSHIP_DELETE = {
	type: "RELATIONSHIP_DELETE";
	user: ActorMention;
};

export type INVITE_CREATE = {
	type: "INVITE_CREATE";
	invite: PublicInvite;
};

export type MEMBERS_CHUNK = {
	type: "MEMBERS_CHUNK";
	/** Role UUID or member */
	items: Array<string | MembersChunkItem>;
};

/** Sent by gateway after a user has been authenticated with IDENTIFY */
export type READY = {
	type: "READY";
	user: PrivateUser;
	session: PrivateSession;
	channels: Array<PublicChannel>;
	guilds: Array<PublicGuild>;
	relationships: Array<PrivateRelationship>;

	/** channel -> users in voice */
	voice: Record<ActorMention, ActorMention[]>;
};

export type HEARTBEAT_ACK = {
	// The expected sequence number
	type: "HEARTBEAT_ACK";
};

export type TYPING = {
	type: "TYPING";
	channel: ActorMention;
	user: ActorMention;
	timestamp: number;
};

export type VOICE_JOIN = {
	type: "VOICE_JOIN";
	channel: ActorMention;
	user: PublicUser;
};

export type VOICE_LEAVE = {
	type: "VOICE_LEAVE";
	channel: ActorMention;
	user: ActorMention;
};

export type VOICE_STATE = {
	type: "VOICE_STATE";
	states: Record<ActorMention, Array<PublicUser>>;
};

export type GATEWAY_EVENT =
	| MESSAGE_CREATE
	| MESSAGE_UPDATE
	| MESSAGE_DELETE
	| CHANNEL_CREATE
	| CHANNEL_UPDATE
	| CHANNEL_DELETE
	| MEDIA_TOKEN_RECEIVED
	| GUILD_CREATE
	| GUILD_UPDATE
	| GUILD_DELETE
	| ROLE_CREATE
	| ROLE_UPDATE
	| ROLE_DELETE
	| ROLE_MEMBER_ADD
	| ROLE_MEMBER_LEAVE
	| MEMBER_JOIN
	| MEMBER_LEAVE
	| RELATIONSHIP_CREATE
	| RELATIONSHIP_UPDATE
	| RELATIONSHIP_DELETE
	| INVITE_CREATE
	| MEMBERS_CHUNK
	| READY
	| HEARTBEAT_ACK
	| TYPING
	| VOICE_JOIN
	| VOICE_LEAVE
	| VOICE_STATE;
