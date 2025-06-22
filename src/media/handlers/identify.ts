import { makeHandler } from ".";
import type { Channel } from "../../entity/channel";
import type { User } from "../../entity/user";
import { CLOSE_CODES } from "../../gateway/util/codes";
import { validateMediaToken } from "../../util/voice";
import { emitMediaEvent, listenMediaEvent } from "../util/events";
import { getJanus } from "../util/janus";
import { getRoomId, setRoomId } from "../util/rooms";
import { IDENTIFY } from "../util/validation/receive";
import { startHeartbeatTimeout } from "./heartbeat";

export const onIdentify = makeHandler(async function (payload) {
	let user: User;
	let channel: Channel;
	try {
		const ret = await validateMediaToken(payload.token);
		user = ret.user;
		channel = ret.channel;
	} catch (e) {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

	this.user_id = user.mention;

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

	this.media_handle_id = (await janus.attachHandle()).id;

	await janus.joinRoom(this.media_handle_id, this.room_id, user.mention);

	const response = await janus.configure(this.media_handle_id, payload.offer);

	await janus.trickle(this.media_handle_id, payload.candidates);

	// Notify other users we arrived
	emitMediaEvent(this.room_id, {
		type: "PEER_JOINED",
		user_id: this.user_id,
	});

	// Join the horde
	this.events = listenMediaEvent(this.room_id, (payload) =>
		this.send(payload),
	);

	this.send({ type: "READY", answer: { jsep: response.jsep } });
}, IDENTIFY);
