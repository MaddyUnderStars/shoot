import type { WebSocket } from "ws";
import type { MEDIA_EVENT } from "./validation/send";

export interface MediaSocket extends Omit<WebSocket, "send"> {
	media_handle_id?: number;

	room_id?: number;

	/** Below is copied from gateway src */

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

	/**
	 * Event emitter UUID -> listener cancel function
	 * We're only ever in a single room at a time, so we only have the 1 listener
	 */
	events: () => unknown;

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

	const ret = { t: type, d: rest, s: this.sequence++ };

	return this.raw_send(JSON.stringify(ret));
}
