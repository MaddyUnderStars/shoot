import type { GATEWAY_EVENT } from ".";
import { createLogger } from "../../util";
import { listenGatewayEvent } from "../../util/events";
import type { Websocket } from "./websocket";

const Log = createLogger("GATEWAY:LISTENER");

/**
 * Register listeners for each event emitter to a gateway client
 * @param socket
 * @param emitters UUIDs of all event emitters, i.e. guilds, channels, users
 * @param callback Optional callback to use instead of default consume behaviour
 */
export const listenEvents = (
	socket: Websocket,
	emitters: string[],
	callback = consume,
) => {
	for (const emitter of emitters) {
		if (socket.events[emitter])
			Log.warn(`${socket.user_id} is already listening to ${emitter}`);

		socket.events[emitter] = listenGatewayEvent(emitter, (payload) =>
			callback(socket, payload),
		);
	}
};

export const removeEventListener = (socket: Websocket, id: string) => {
	socket.events[id]();
	delete socket.events[id];
};

export const consume = async (socket: Websocket, payload: GATEWAY_EVENT) => {
	switch (payload.type) {
		case "RELATIONSHIP_CREATE": {
			listenEvents(socket, [payload.relationship.user.id]);
			break;
		}
		case "RELATIONSHIP_DELETE": {
			removeEventListener(socket, payload.user_id);
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
