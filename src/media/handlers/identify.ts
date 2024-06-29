import { makeHandler } from ".";
import { Channel, User } from "../../entity";
import { CLOSE_CODES } from "../../gateway/util";
import { validateMediaToken } from "../../util/voice";
import { IDENTIFY } from "../util";
import { getJanus } from "../util/janus";
import { startHeartbeatTimeout } from "./heartbeat";

import { EchoTestPlugin } from "janode";

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

	this.media_session = await getJanus().create();

	this.media_handle = await this.media_session.attach(EchoTestPlugin);

	const answer = await this.media_handle.start({
		audio: true,
		video: true,
		jsep: payload.offer,
		bitrate: 1000,
	});

	for (const candidate of payload.candidates) {
		await this.media_handle.trickle(candidate);
	}

	await this.media_handle.trickleComplete();

	return await this.send({ type: "READY", answer: answer });
}, IDENTIFY);
