import { CloseEvent } from "ws";
import { Session } from "../../entity";
import { createLogger } from "../../util";
import { Websocket } from "../util/websocket";

const Log = createLogger("gateway");

export async function onClose(this: Websocket, event: CloseEvent) {
	Log.verbose(`${this.ip_address} disconnected with code ${event.code}`);

	clearTimeout(this.auth_timeout);

	// remove all gateway event listeners for this socket
	for (const target in this.events) {
		this.events[target]();
	}

	if (this.session) await Session.delete({ id: this.session.id });
}
