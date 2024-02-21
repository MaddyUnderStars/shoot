import { CloseEvent } from "ws";
import { Session } from "../../entity";
import { createLogger } from "../../util";
import { Websocket } from "../util/websocket";

const Log = createLogger("gateway");

export async function onClose(this: Websocket, event: CloseEvent) {
	Log.verbose(`${this.ip_address} disconnected with code ${event.code}`);

	clearTimeout(this.auth_timeout);

	await Session.delete({ id: this.session.id });
}
