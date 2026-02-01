import type { GatewayMessageHandler } from "../util/handler";
import { onHeartbeat } from "./heartbeat";
import { onIdentify } from "./identify";
import { onSubscribeMembers } from "./members";
import { onTyping } from "./typing";

export const handlers = {
	identify: onIdentify,
	heartbeat: onHeartbeat,
	members: onSubscribeMembers,
	typing: onTyping,
} as Record<string, GatewayMessageHandler<unknown>>;
