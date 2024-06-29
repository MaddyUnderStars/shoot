import { Session } from "janode";
import { MEDIA_EVENT } from "./validation";

export interface MediaSocket extends Omit<WebSocket, "send"> {
	/** Janode media session */
	media_session: Session;

	media_handle: any;

	/** Before is copied from gateway src */

	/** The source IP address of this socket */
	ip_address: string;

	/** The user ID of this authenticated socket */
	user_id: string;

	/** The current sequence/event number for this socket */
	sequence: number;

	/** When triggered, disconnect this client. They have not authed in time */
	auth_timeout?: NodeJS.Timeout;

	/** When triggered, disconnect this client. They have not sent a heartbeat in time */
	heartbeat_timeout?: NodeJS.Timeout;

	/** The original socket.send function */
	raw_send: (
		this: MediaSocket,
		data: string | ArrayBufferLike | Blob | ArrayBufferView,
	) => unknown;

	/** The new socket.send function */
	send: (this: MediaSocket, data: MEDIA_EVENT) => unknown;
}

export function send(this: MediaSocket, data: MEDIA_EVENT) {
	// TODO: zlib encoding?

	const { type, ...rest } = data;

	const ret = { t: data.type, d: rest, s: this.sequence++ };

	return this.raw_send(JSON.stringify(ret));
}
