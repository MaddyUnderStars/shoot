import { User } from "../../entity/user";
import { getChannel } from "../../util/entity/channel";
import { emitGatewayEvent } from "../../util/events";
import { PERMISSION } from "../../util/permission";
import { makeHandler } from "../util/handler";
import { TYPING } from "../util/validation/receive";

export const onTyping = makeHandler(async function (payload) {
	const now = Date.now();

	if (this.last_typing && now - this.last_typing < 5000) return;
	this.last_typing = now;

	const channel = await getChannel(payload.channel);

	if (!channel) throw new Error("Channel does not exist");

	await channel.throwPermission(
		User.create({ id: this.user_id }),
		PERMISSION.VIEW_CHANNEL,
	);

	emitGatewayEvent(channel, {
		type: "TYPING",
		channel: payload.channel,
		user: this.user_mention,
		timestamp: now,
	});
}, TYPING);
