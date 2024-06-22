import { makeHandler } from ".";
import { CLOSE_CODES } from "../../gateway/util";
import { getUserFromToken } from "../../util";
import { IDENTIFY } from "../util";
import { startHeartbeatTimeout } from "./heartbeat";

export const onIdentify = makeHandler(async function (payload) {
	let user;
	try {
		user = await getUserFromToken(payload.token);
	} catch (e) {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

	this.user_id = user.id;

	startHeartbeatTimeout(this);

	clearTimeout(this.auth_timeout);

	return await this.send({ type: "READY" });
}, IDENTIFY);
