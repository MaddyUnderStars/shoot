import type { GATEWAY_EVENT } from ".";
import { listenGatewayEvent } from "../../util/events";
import type { Websocket } from "./websocket";

/**
 * Register listeners for each event emitter to a gateway client
 * @param socket
 * @param emitters UUIDs of all event emitters, i.e. guilds, channels, users
 */
export const listenEvents = (socket: Websocket, emitters: string[]) => {
	for (const emitter of emitters) {
		socket.events[emitter] = listenGatewayEvent(emitter, (payload) =>
			consume(socket, payload),
		);
	}
};

export const consume = async (socket: Websocket, payload: GATEWAY_EVENT) => {
	switch (payload.type) {
		case "RELATIONSHIP_CREATE": {
			listenEvents(socket, [payload.relationship.user.id]);
			break;
		}
		case "CHANNEL_CREATE":
			listenEvents(socket, [payload.channel.id]);
			break;
		case "GUILD_CREATE":
			listenEvents(socket, [payload.guild.id]);
			break;
		default:
			break;
	}

	socket.send({
		t: payload.type,
		d: { ...payload, type: undefined },
	});
};
