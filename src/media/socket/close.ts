import { createLogger } from "../../util";
import { MediaSocket } from "../util/websocket";

const Log = createLogger("media");

export async function onClose(this: MediaSocket, event: CloseEvent) {
	Log.verbose(`${this.ip_address} disconnected with code ${event.code}`);

	clearTimeout(this.auth_timeout);
	clearTimeout(this.heartbeat_timeout);

	if (this.media_handle) {
		await this.media_handle.leave();
		await this.media_handle.detach();
	}
}
