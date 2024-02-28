import { IncomingMessage } from "http";
import ws from "ws";
import { createLogger } from "../../util";
import { CLOSE_CODES, Websocket, send } from "../util";
import { onClose } from "./close";
import { onMessage } from "./message";

const Log = createLogger("GATEWAY");

export function onConnection(
	this: ws.Server,
	socket: Websocket,
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

	//@ts-ignore what is wrong here
	socket.addEventListener("close", onClose);
	//@ts-ignore
	socket.addEventListener("message", async function (ev) {
		try {
			await onMessage.call(socket, ev);
		} catch (e) {
			this.close(CLOSE_CODES.SERVER_ERROR);
			Log.error(`message handler failed with`, e);
		}
	});

	// Trigger auth timeout after 10 seconds
	socket.auth_timeout = setTimeout(
		() => socket.close(CLOSE_CODES.IDENTIFY_TIMEOUT),
		10_000,
	);
}
