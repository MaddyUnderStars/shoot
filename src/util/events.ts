import EventEmitter from "node:events";
import type { GATEWAY_EVENT } from "../gateway/util/validation";

const events = new EventEmitter();

export const emitGatewayEvent = (
	targets: string | string[],
	payload: GATEWAY_EVENT,
) => {
	if (!Array.isArray(targets)) targets = [targets];

	for (const target of targets) {
		events.emit(target, payload);
	}
};

export const listenGatewayEvent = (
	target: string,
	callback: (payload: GATEWAY_EVENT) => unknown,
) => {
	events.setMaxListeners(events.getMaxListeners() + 1);
	events.addListener(target, callback);

	return () => {
		events.removeListener(target, callback);
		events.setMaxListeners(events.getMaxListeners() - 1);
	};
};
