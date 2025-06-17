import type { GATEWAY_EVENT } from "../../gateway/util/validation";
import { internal } from "./internal";

const events = internal;

export const initEvents = async () => {};

export const emitGatewayEvent = (
	targets: string | string[],
	payload: GATEWAY_EVENT,
) => {
	events.emitGatewayEvent(targets, payload);
};

export const listenGatewayEvent = (
	target: string,
	callback: (payload: GATEWAY_EVENT) => unknown,
) => {
	events.listenGatewayEvent(target, callback);
};
