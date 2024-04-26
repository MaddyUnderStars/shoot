import { Session } from "../../entity";
import { GATEWAY_PAYLOAD } from "./validation";

export interface Websocket extends Omit<WebSocket, "send"> {
	/** The source IP address of this socket */
	ip_address: string;

	/** The user ID of this authenticated socket */
	user_id: string;

	/** The session attached to this connection */
	session: Session;

	/** The current sequence/event number for this socket */
	sequence: number;

	/** When triggered, disconnect this client. They have not authed in time */
	auth_timeout?: NodeJS.Timeout;

	/** When triggered, disconnect this client. They have not sent a heartbeat in time */
	heartbeat_timeout?: NodeJS.Timeout;

	/** Event emitter UUID -> listener cancel function */
	events: Record<string, () => unknown>;

	/** The original socket.send function */
	raw_send: (
		this: Websocket,
		data: string | ArrayBufferLike | Blob | ArrayBufferView,
	) => unknown;

	/** The new socket.send function */
	send: (this: Websocket, data: GATEWAY_PAYLOAD) => unknown;
}

export function send(this: Websocket, data: GATEWAY_PAYLOAD) {
	// TODO: zlib encoding?

	const ret = { ...data, s: this.sequence++ };

	return this.raw_send(JSON.stringify(ret));
}
