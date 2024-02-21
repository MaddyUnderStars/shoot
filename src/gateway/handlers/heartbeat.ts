import { makeHandler } from ".";
import { HEARTBEAT, HEARTBEAT_ACK, Websocket, consume } from "../util";

export const onHeartbeat = makeHandler(async function (payload) {
	if (payload.s != this.sequence)
		// TODO: send them back the missing events
		throw new Error("Out of sync. Reconnect");

	clearTimeout(this.heartbeat_timeout);
	this.heartbeat_timeout = setTimeout(() => heartbeatTimeout(this), 5000);

	const ret: HEARTBEAT_ACK = {
		type: "HEARTBEAT_ACK",
	};

	return await consume(this, ret);
}, HEARTBEAT);

export const heartbeatTimeout = (socket: Websocket) => {
	socket.close();
};
