import type { CloseEvent } from "ws";
import { Session } from "../../entity/session";
import { createLogger } from "../../util/log";
import type { Websocket } from "../util/websocket";

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
