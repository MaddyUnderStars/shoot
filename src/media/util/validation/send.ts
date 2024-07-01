export type HEARTBEAT_ACK = {
	// The expected sequence number
	type: "HEARTBEAT_ACK";
};

export type READY = {
	type: "READY";
	answer: any;
};

export type PEER_JOINED = {
	type: "PEER_JOINED";
	user_id: string;
};

export type PEER_LEFT = {
	type: "PEER_LEFT";
	user_id: string;
};

export type MEDIA_EVENT = HEARTBEAT_ACK | PEER_JOINED | PEER_LEFT | READY;
