import type { GatewayMessageHandler } from "../util/handler";
import { onHeartbeat } from "./heartbeat";
import { onIdentify } from "./identify";
import { onSubscribeMembers } from "./members";
import { onTyping } from "./typing";
import { onVoiceQuery } from "./voiceQuery";

export const handlers = {
	identify: onIdentify,
	heartbeat: onHeartbeat,
	members: onSubscribeMembers,
	typing: onTyping,
	voices: onVoiceQuery,
} as Record<string, GatewayMessageHandler<unknown>>;
