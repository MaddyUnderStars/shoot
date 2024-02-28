import {
	PrivateSession,
	PrivateUser,
	PublicChannel,
	PublicDmChannel,
	PublicMessage,
} from "../../../entity";
import { Relationship } from "../../../entity/relationship";

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
	channel: PublicDmChannel;
};

export type RELATIONSHIP_CREATE = {
	type: "RELATIONSHIP_CREATE";
	relationship: Relationship;
};

/** Sent by gateway after a user has been authenticated with IDENTIFY */
export type READY = {
	type: "READY";
	user: PrivateUser;
	session: PrivateSession;
	channels: Array<PublicChannel>;
};

export type HEARTBEAT_ACK = {
	// The expected sequence number
	type: "HEARTBEAT_ACK";
};

export type GATEWAY_EVENT =
	| MESSAGE_CREATE
	| CHANNEL_CREATE
	| RELATIONSHIP_CREATE
	| READY
	| HEARTBEAT_ACK;
