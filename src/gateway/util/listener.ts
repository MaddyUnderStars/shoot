import type { BaseModel } from "../../entity/basemodel.js";
import { Channel } from "../../entity/channel.js";
import { Guild } from "../../entity/guild.js";
import { splitQualifiedMention } from "../../util/activitypub/util.js";
import { channelInGuild } from "../../util/entity/channel.js";
import { listenGatewayEvent, makeGatewayTarget } from "../../util/events.js";
import { createLogger } from "../../util/log.js";
import { handleMemberListRoleAdd } from "../handlers/members.js";
import type { GATEWAY_EVENT } from "./validation/send.js";
import type { Websocket } from "./websocket.js";

const Log = createLogger("GATEWAY:LISTENER");

/**
 * Register listeners for each event emitter to a gateway client
 * @param socket
 * @param emitters UUIDs of all event emitters, i.e. guilds, channels, users
 * @param callback Optional callback to use instead of default consume behaviour
 */
export const listenEvents = (socket: Websocket, emitters: BaseModel[], callback = consume) => {
	for (const emitter of emitters) {
		const id = makeGatewayTarget(emitter);

		if (socket.events[id]) Log.warn(`${socket.user_id} is already listening to ${emitter}`);

		socket.events[id] = listenGatewayEvent(emitter, callback.bind(null, socket));
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
		// TODO: for relationships, see #54
		case "CHANNEL_CREATE": {
			const { id } = splitQualifiedMention(payload.channel.mention);
			listenEvents(socket, [Channel.create({ id })]);
			break;
		}
		case "GUILD_CREATE": {
			const { id } = splitQualifiedMention(payload.guild.mention);
			listenEvents(socket, [Guild.create({ id })]);
			break;
		}
		case "GUILD_DELETE":
			// if we leave a guild that we're subscribed to, remove our subscription
			if (
				!socket.member_list.channel_id ||
				!(await channelInGuild(socket.member_list.channel_id, payload.guild))
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

			if (socket.member_list.channel_id !== payload.channel) break;

			for (const id in socket.member_list.events) {
				socket.member_list.events[id]();
				delete socket.member_list.events[id];
			}
			socket.member_list.channel_id = undefined;
			socket.member_list.range = undefined;

			break;

		case "ROLE_MEMBER_ADD":
			setImmediate(handleMemberListRoleAdd, socket, payload);

			break;

		case "TYPING":
			// don't send our typing indicators to ourselves
			if (payload.user === socket.user_mention) return;

			break;

		case "MESSAGE_CREATE":
			// when we send a message, reset the last typing timestamp
			// so that we can send typing events again
			if (payload.message.author_id === socket.user_mention) {
				socket.last_typing = undefined;
			}

			break;
		default:
			break;
	}

	socket.send({
		t: payload.type,
		d: { ...payload, type: undefined },
	});
};
