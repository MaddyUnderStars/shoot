import type { GatewayMessageHandler } from "../util/handler.js";
import { onHeartbeat } from "./heartbeat.js";
import { onIdentify } from "./identify.js";
import { onSubscribeMembers } from "./members.js";
import { onTyping } from "./typing.js";
import { onVoiceQuery } from "./voiceQuery.js";

export const handlers = {
	identify: onIdentify,
	heartbeat: onHeartbeat,
	members: onSubscribeMembers,
	typing: onTyping,
	voices: onVoiceQuery,
} as Record<string, GatewayMessageHandler<unknown>>;
