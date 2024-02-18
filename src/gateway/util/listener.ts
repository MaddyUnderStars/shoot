import { GATEWAY_EVENT } from ".";
import { listenGatewayEvent } from "../../util/events";
import { Websocket } from "./websocket";

/**
 * Register listeners for each event emitter to a gateway client
 * @param socket
 * @param emitters UUIDs of all event emitters, i.e. guilds, channels, users
 */
export const listenEvents = async (socket: Websocket, emitters: string[]) => {
	for (const emitter of emitters) {
		listenGatewayEvent(emitter, (payload) => consume(socket, payload));
	}
};

export const consume = async (socket: Websocket, payload: GATEWAY_EVENT) => {
	switch (payload.type) {
		default:
			break;
	}

	socket.send({
		t: payload.type,
		d: { ...payload, type: undefined },
	});
};