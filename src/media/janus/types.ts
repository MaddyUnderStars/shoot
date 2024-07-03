export type RESPONSE_CREATE_SESSION = {
	id: number;
};

export type RESPONSE_ATTACH_HANDLE = {
	id: number;
};

export type RESPONSE_CREATE_ROOM = {
	audiobridge: "created";
	room: number;
	permanent: boolean;
};

export type RESPONSE_JOIN_ROOM = {
	audiobridge: "joined";
	room: number;
	id: number;
	display: string;
	participants: string[];
};

export type RESPONSE_CONFIGURE = {
	audiobridge: "event";
	result: "ok";
	jsep: { type: "answer"; sdp: string };
};

export type JANUS_RESPONSE_DATA =
	| RESPONSE_CONFIGURE
	| RESPONSE_JOIN_ROOM
	| RESPONSE_CREATE_ROOM
	| RESPONSE_CREATE_SESSION
	| RESPONSE_ATTACH_HANDLE;

type JANUS_ACK = {
	janus: "ack";
	session_id: number;
	transaction: string;
};

type JANUS_SUCCESS<T extends JANUS_RESPONSE_DATA> = {
	janus: "success" | "event";
	transaction: string;
	session_id?: number;
	sender?: number;
	data: T;

	plugindata?: T;
	jsep?: { type: "answer"; sdp: string };
};

export type JANUS_RESPONSE<T extends JANUS_RESPONSE_DATA> =
	| JANUS_SUCCESS<T>
	| JANUS_ACK;

type REQUEST_TRICKLE = {
	janus: "trickle";
	candidates: Array<RTCIceCandidateInit | null>;
	session_id: number;
	handle_id: number;
};

type REQUEST_CONFIGURE = {
	janus: "message";
	body: {
		request: "configure";
	};
	jsep?: {
		type: string;
		sdp: string;
	};
	session_id: number;
	handle_id: number;
};

type REQUEST_JOIN_ROOM = {
	janus: "message";
	body: {
		request: "join";
		room: number;
		display?: string;

		// TODO
	};

	session_id: number;
	handle_id: number;
};

type REQUEST_CREATE_ROOM = {
	janus: "message";
	body: {
		request: "create";
		room?: number;
	};

	session_id: number;
	handle_id: number;
};

type REQUEST_CREATE_SESSION = {
	janus: "create";
};

type REQUEST_ATTACH_HANDLE = {
	janus: "attach";
	session_id: number;
	plugin: string;
};

export type JANUS_REQUEST =
	| REQUEST_TRICKLE
	| REQUEST_JOIN_ROOM
	| REQUEST_CONFIGURE
	| REQUEST_CREATE_SESSION
	| REQUEST_ATTACH_HANDLE
	| REQUEST_CREATE_ROOM;
