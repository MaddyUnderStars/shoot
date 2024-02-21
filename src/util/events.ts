import EventEmitter from "events";
import { GATEWAY_EVENT } from "../gateway/util";

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
	events.addListener(target, callback);
};
