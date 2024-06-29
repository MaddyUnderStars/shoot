export type HEARTBEAT_ACK = {
	// The expected sequence number
	type: "HEARTBEAT_ACK";
};

export type READY = {
	type: "READY";
	answer: any;
};

export type MEDIA_EVENT = HEARTBEAT_ACK | READY;
