import EventEmitter from "events";
import { GATEWAY_EVENT } from "../gateway/util";

const events = new EventEmitter();

export const emitGatewayEvent = (target: string, payload: GATEWAY_EVENT) => {
	events.emit(target, payload);
};

export const listenGatewayEvent = (
	target: string,
	callback: (payload: GATEWAY_EVENT) => unknown,
) => {
	events.addListener(target, callback);
};
