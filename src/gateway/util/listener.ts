import { channelInGuild, createLogger } from "../../util";
import { listenGatewayEvent } from "../../util/events";
import { handleMemberListRoleAdd } from "../handlers/members";
import type { GATEWAY_EVENT } from "./validation";
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
	if (!socket.events[id]) {
		Log.warn(`No listener for target ${id} on ${socket.user_id} to remove`);
		return;
	}

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
		case "GUILD_DELETE":
			// if we leave a guild that we're subscribed to, remove our subscription
			if (
				!socket.member_list.channel_id ||
				!(await channelInGuild(
					socket.member_list.channel_id,
					payload.guild_id,
				))
			)
				break;

			// remove all our subscriptions to this channel,
			// as it's guild was just deleted

			for (const id in socket.member_list.events) {
				socket.member_list.events[id]();
				delete socket.member_list.events[id];
			}
			socket.member_list.channel_id = undefined;
			socket.member_list.range = undefined;

			break;

		case "CHANNEL_DELETE":
			// if we're subscribed to this channel, unsub

			if (socket.member_list.channel_id !== payload.channel_id) break;

			for (const id in socket.member_list.events) {
				socket.member_list.events[id]();
				delete socket.member_list.events[id];
			}
			socket.member_list.channel_id = undefined;
			socket.member_list.range = undefined;

			break;

		case "ROLE_MEMBER_ADD":
			// don't care about errors and can't slow down this function
			setImmediate(() =>
				handleMemberListRoleAdd(socket, payload).catch(() => {}),
			);

			break;
		default:
			break;
	}

	socket.send({
		t: payload.type,
		d: { ...payload, type: undefined },
	});
};
