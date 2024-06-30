import { AudioBridgePlugin } from "janode";
import { makeHandler } from ".";
import { Channel, User } from "../../entity";
import { CLOSE_CODES } from "../../gateway/util";
import { validateMediaToken } from "../../util/voice";
import { IDENTIFY } from "../util";
import { getJanusHandle, getJanusSession } from "../util/janus";
import { getRoomId, setRoomId } from "../util/rooms";
import { startHeartbeatTimeout } from "./heartbeat";

export const onIdentify = makeHandler(async function (payload) {
	let user: User, channel: Channel;
	try {
		const ret = await validateMediaToken(payload.token);
		user = ret.user;
		channel = ret.channel;
	} catch (e) {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

	startHeartbeatTimeout(this);

	clearTimeout(this.auth_timeout);

	this.user_id = user.id;

	const manager = getJanusHandle();

	let room_id = getRoomId(channel.id);
	if (!room_id) {
		// Room doesn't exist yet, make it
		const res = await manager.create({});
		setRoomId(channel.id, res.room);
		room_id = res.room;
	}

	this.media_handle = await getJanusSession().attach(AudioBridgePlugin);

	await this.media_handle.join({ room: room_id });

	const response = await this.media_handle.configure({ jsep: payload.offer });

	// TODO: ice fails and 'failed to add some remote candidates'
	for (const candidate of payload.candidates) {
		await this.media_handle.trickle(candidate);
	}

	await this.media_handle.trickleComplete();

	this.send({ type: "READY", answer: response });
}, IDENTIFY);
