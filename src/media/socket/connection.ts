import type { IncomingMessage } from "node:http";
import type ws from "ws";
import { CLOSE_CODES } from "../../gateway/util";
import { createLogger } from "../../util";
import { send, type MediaSocket } from "../util";
import { onClose } from "./close";
import { onMessage } from "./message";

const Log = createLogger("media");

export function onConnection(
	this: ws.Server,
	socket: MediaSocket,
	request: IncomingMessage,
) {
	socket.sequence = 0;

	//@ts-expect-error
	socket.raw_send = socket.send;
	socket.send = send.bind(socket);

	// TODO: trust proxy
	const ip =
		request.headers["x-forwarded-for"] ||
		request.socket.remoteAddress ||
		"unknown";
	socket.ip_address = Array.isArray(ip) ? ip[0] : ip;

	Log.verbose(`New client from '${socket.ip_address}'`);

	socket.addEventListener("close", async (ev) => {
		try {
			await onClose.call(socket, ev);
		} catch (e) {
			Log.error("close handler failed with", e);
		}
	});

	socket.addEventListener("message", async function (ev) {
		try {
			await onMessage.call(socket, ev);
		} catch (e) {
			this.close(CLOSE_CODES.SERVER_ERROR);
			Log.error("message handler failed with", e);
		}
	});

	// Trigger auth timeout after 10 seconds
	socket.auth_timeout = setTimeout(
		() => socket.close(CLOSE_CODES.IDENTIFY_TIMEOUT),
		10_000,
	);
}
