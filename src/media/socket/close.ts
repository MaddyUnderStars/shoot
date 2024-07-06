import { createLogger } from "../../util";
import { emitMediaEvent } from "../util/events";
import { getJanus } from "../util/janus";
import type { MediaSocket } from "../util/websocket";

const Log = createLogger("media");

export async function onClose(this: MediaSocket, event: CloseEvent) {
	Log.verbose(`${this.ip_address} disconnected with code ${event.code}`);

	clearTimeout(this.auth_timeout);
	clearTimeout(this.heartbeat_timeout);

	const janus = getJanus();

	// Leave the room
	if (this.media_handle_id) await janus.leaveRoom(this.media_handle_id);

	// Close our room listener if we have one
	this.events?.();

	// Notify others
	if (this.room_id)
		emitMediaEvent(this.room_id, {
			type: "PEER_LEFT",
			user_id: this.user_id,
		});
}
