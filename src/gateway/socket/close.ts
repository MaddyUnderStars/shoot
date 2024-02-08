import { CloseEvent } from "ws";
import { createLogger } from "../../util";
import { Websocket } from "../util/websocket";

const Log = createLogger("gateway");

export function onClose(this: Websocket, event: CloseEvent) {
	Log.verbose(`${this.ip_address} disconnected with code ${event.code}`);

	clearTimeout(this.auth_timeout);

	// TODO: delete the session
}
