import { makeHandler } from ".";
import { CLOSE_CODES } from "../../gateway/util/codes";
import { HEARTBEAT, type HEARTBEAT_ACK, type MediaSocket } from "../util";

export const onHeartbeat = makeHandler(async function (payload) {
	if (payload.s !== this.sequence)
		// TODO: send them back the missing events
		throw new Error("Out of sync. Reconnect");

	clearTimeout(this.heartbeat_timeout);
	startHeartbeatTimeout(this);

	const ret: HEARTBEAT_ACK = {
		type: "HEARTBEAT_ACK",
	};

	return await this.send(ret);
}, HEARTBEAT);

export const heartbeatTimeout = (socket: MediaSocket) => {
	socket.close(CLOSE_CODES.HEARTBEAT_TIMEOUT);
};

export const startHeartbeatTimeout = (socket: MediaSocket) => {
	socket.heartbeat_timeout = setTimeout(
		() => heartbeatTimeout(socket),
		10_000,
	);
};
