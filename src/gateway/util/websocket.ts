import { Session } from "../../entity";

export interface Websocket extends Omit<WebSocket, "send"> {
	/** The source IP address of this socket */
	ip_address: string;

	/** The user ID of this authenticated socket */
	user_id: string;

	/** The session attached to this connection */
	session: Session;

	/** When triggered, disconnect this client. They have not authed in time */
	auth_timeout?: NodeJS.Timeout;

	/** The original socket.send function */
	raw_send: (
		this: Websocket,
		data: string | ArrayBufferLike | Blob | ArrayBufferView,
	) => unknown;

	/** The new socket.send function */
	send: (this: Websocket, data: object) => unknown;
}

export function send(this: Websocket, data: object) {
	// TODO: zlib encoding?

	return this.raw_send(JSON.stringify(data));
}
