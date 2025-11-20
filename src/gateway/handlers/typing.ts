import { makeHandler } from ".";
import { PERMISSION } from "../../util/permission";
import { emitGatewayEvent } from "../../util/events";
import { getChannel } from "../../util/entity/channel";
import { User } from "../../entity/user";
import { TYPING } from "../util/validation/receive";
export const onTyping = makeHandler(async function(payload){
if((Date.now() - this.last_typing) < 5000) return;
const channel = await getChannel(payload.channel);
if (!channel) throw new Error("Channel does not exist");
await channel.throwPermission(
User.create({id: this.user_id }),
PERMISSION.VIEW_CHANNEL,
);
emitGatewayEvent(channel, {
type: "TYPING",
channel: payload.channel,
user: this.user_mention,
timestamp: Date.now()
});
},TYPING);