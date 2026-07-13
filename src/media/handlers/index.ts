import { onIdentify } from "./identify.js";
import { onHeartbeat } from "./heartbeat.js";
import { GatewayMessageHandler } from "../util/handler.js";

export const handlers = {
	identify: onIdentify,
	heartbeat: onHeartbeat,
} as Record<string, GatewayMessageHandler<unknown>>;
