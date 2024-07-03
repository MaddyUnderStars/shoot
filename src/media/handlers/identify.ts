import { makeHandler } from ".";
import type { Channel, User } from "../../entity";
import { CLOSE_CODES } from "../../gateway/util";
import { validateMediaToken } from "../../util/voice";
import { IDENTIFY } from "../util";
import { getJanus } from "../util/janus";
import { getRoomId, setRoomId } from "../util/rooms";
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

	startHeartbeatTimeout(this);

	clearTimeout(this.auth_timeout);

	const janus = getJanus();

	let room_id = getRoomId(channel.id);
	if (!room_id) {
		// Room doesn't exist yet, make it
		const res = await janus.createRoom();
		setRoomId(channel.id, res.room);
		room_id = res.room;
	}

	this.media_handle_id = (await janus.attachHandle(janus.session)).id;

	await janus.joinRoom(
		janus.session,
		this.media_handle_id,
		room_id,
		user.mention,
	);

	const response = await janus.configure(
		janus.session,
		this.media_handle_id,
		payload.offer,
	);

	await janus.trickle(
		janus.session,
		this.media_handle_id,
		payload.candidates,
	);

	// // TODO: ice fails and 'failed to add some remote candidates'
	// for (const candidate of payload.candidates) {
	// 	await this.media_handle.trickle(candidate);
	// }

	// await this.media_handle.trickleComplete();

	// this.media_handle.on(
	// 	"audiobridge_peer_joined",
	// 	(data: JANUS_PEER_JOINED) => {
	// 		setPeerId(data.feed, data.display);
	// 		this.send({ type: "PEER_JOINED", user_id: data.display });
	// 	},
	// );

	// this.media_handle.on(
	// 	"audiobridge_peer_leaving",
	// 	(data: JANUS_PEER_LEAVING) => {
	// 		const id = getPeerId(data.feed);
	// 		if (!id) return;
	// 		this.send({ type: "PEER_LEFT", user_id: id });
	// 		removePeerId(data.feed);
	// 	},
	// );

	this.send({ type: "READY", answer: { jsep: response.jsep } });
}, IDENTIFY);

type JANUS_PEER_JOINED = {
	feed: number;
	display: string;
};

type JANUS_PEER_LEAVING = {
	feed: number;
};
