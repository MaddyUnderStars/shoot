import { CLOSE_CODES } from "../util/codes.js";
import { makeHandler } from "../util/handler.js";
import { consume } from "../util/listener.js";
import { HEARTBEAT } from "../util/validation/receive.js";
import type { HEARTBEAT_ACK } from "../util/validation/send.js";
import type { Websocket } from "../util/websocket.js";

export const onHeartbeat = makeHandler(async function (payload) {
	if (payload.s !== this.sequence)
		// TODO: send them back the missing events
		throw new Error("Out of sync. Reconnect");

	clearTimeout(this.heartbeat_timeout);
	startHeartbeatTimeout(this);

	const ret: HEARTBEAT_ACK = {
		type: "HEARTBEAT_ACK",
	};

	return await consume(this, ret);
}, HEARTBEAT);

export const heartbeatTimeout = (socket: Websocket) => {
	socket.close(CLOSE_CODES.HEARTBEAT_TIMEOUT);
};

export const startHeartbeatTimeout = (socket: Websocket) => {
	socket.heartbeat_timeout = setTimeout(heartbeatTimeout, 10_000, socket);
};
