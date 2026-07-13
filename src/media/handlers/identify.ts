import type { Channel } from "../../entity/channel.js";
import type { User } from "../../entity/user.js";
import { VoiceState } from "../../entity/voiceState.js";
import { CLOSE_CODES } from "../../gateway/util/codes.js";
import { emitGatewayEvent } from "../../util/events.js";
import { validateMediaToken } from "../../util/voice.js";
import { emitMediaEvent, listenMediaEvent } from "../util/events.js";
import { getJanus } from "../util/janus.js";
import { getRoomId, setRoomId } from "../util/rooms.js";
import { IDENTIFY } from "../util/validation/receive.js";
import { makeHandler } from "./index.js";
import { startHeartbeatTimeout } from "./heartbeat.js";

export const onIdentify = makeHandler(async function (payload) {
	let user: User;
	let channel: Channel;
	try {
		const ret = await validateMediaToken(payload.token);
		user = ret.user;
		channel = ret.channel;
	} catch {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

	this.user_mention = user.mention;
	this.user_id = user.id;

	startHeartbeatTimeout(this);

	clearTimeout(this.auth_timeout);

	const janus = getJanus();

	this.room_id = getRoomId(channel.id);
	if (!this.room_id) {
		// Room doesn't exist yet, make it
		const res = await janus.createRoom();
		setRoomId(channel.id, res.room);
		this.room_id = res.room;
	}

	this.channel_id = channel.id;
	this.channel_mention = channel.mention;

	this.media_handle_id = (await janus.attachHandle()).id;

	await janus.joinRoom(this.media_handle_id, this.room_id, user.mention);

	const response = await janus.configure(this.media_handle_id, payload.offer);

	await janus.trickle(this.media_handle_id, payload.candidates);

	this.send({ type: "READY", answer: { jsep: response.jsep } });

	// Notify other users we arrived
	emitMediaEvent(this.room_id, {
		type: "PEER_JOINED",
		user_id: this.user_mention,
	});

	emitGatewayEvent(channel, {
		type: "VOICE_JOIN",
		channel: channel.mention,
		user: user.toPublic(),
	});

	// Join the horde
	this.events = listenMediaEvent(this.room_id, (data) => this.send(data));

	await VoiceState.upsert(
		VoiceState.create({
			user,
			channel,
			joined: new Date(),
		}),
		["userId"],
	);
}, IDENTIFY);
