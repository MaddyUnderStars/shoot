import EventEmitter from "node:events";
import type { MEDIA_EVENT } from "./validation/send";

const events = new EventEmitter();

export const emitMediaEvent = (room_id: number, payload: MEDIA_EVENT) =>
	events.emit(`${room_id}`, payload);

export const listenMediaEvent = (
	room_id: number,
	callback: (payload: MEDIA_EVENT) => unknown,
) => {
	events.setMaxListeners(events.getMaxListeners() + 1);
	events.addListener(`${room_id}`, callback);

	return () => {
		events.removeListener(`${room_id}`, callback);
		events.setMaxListeners(events.getMaxListeners() - 1);
	};
};
