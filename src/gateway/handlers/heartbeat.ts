import { makeHandler } from ".";
import { CLOSE_CODES } from "../util/codes";
import { consume } from "../util/listener";
import { HEARTBEAT, type HEARTBEAT_ACK } from "../util/validation";
import type { Websocket } from "../util/websocket";
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
	socket.heartbeat_timeout = setTimeout(
		() => heartbeatTimeout(socket),
		10_000,
	);
};
