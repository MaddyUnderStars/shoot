import {
	PrivateSession,
	PrivateUser,
	PublicChannel,
	PublicMessage,
} from "../../../entity";

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

/** Sent by gateway after a user has been authenticated with IDENTIFY */
export type READY = {
	type: "READY";
	user: PrivateUser;
	session: PrivateSession;
	channels: Array<PublicChannel>;
};

export type GATEWAY_EVENT = MESSAGE_CREATE | READY;
