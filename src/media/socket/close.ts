import { CloseEvent } from "ws";
import { createLogger } from "../../util";
import { MediaSocket } from "../util/websocket";

const Log = createLogger("media");

export async function onClose(this: MediaSocket, event: CloseEvent) {
	Log.verbose(`${this.ip_address} disconnected with code ${event.code}`);

	clearTimeout(this.auth_timeout);
}
