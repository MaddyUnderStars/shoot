import type { IncomingMessage } from "node:http";
import type { WebSocketServer } from "ws";
import { createLogger } from "../../util/log.js";
import { CLOSE_CODES } from "../util/codes.js";
import { send, type Websocket } from "../util/websocket.js";
import { onClose } from "./close.js";
import { onMessage } from "./message.js";

const Log = createLogger("GATEWAY");

export function onConnection(this: WebSocketServer, socket: Websocket, request: IncomingMessage) {
	socket.events = {};
	socket.member_list = {
		channel_id: undefined,
		range: undefined,
		events: {},
	};

	socket.sequence = 0;

	//@ts-expect-error
	socket.raw_send = socket.send;
	socket.send = send.bind(socket);

	// TODO: trust proxy
	const ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown";
	socket.ip_address = Array.isArray(ip) ? ip[0] : ip;

	Log.verbose(`New client from '${socket.ip_address}'`);

	//@ts-expect-error what is wrong here
	socket.addEventListener("close", onClose);
	//@ts-expect-error what is wrong here
	socket.addEventListener("message", tryOnMessage);

	// Trigger auth timeout after 10 seconds
	socket.auth_timeout = setTimeout(socket.close, 10_000, CLOSE_CODES.IDENTIFY_TIMEOUT);
}

async function tryOnMessage(this: Websocket, ev: MessageEvent) {
	try {
		await onMessage.call(this, ev);
	} catch (e) {
		this.close(CLOSE_CODES.SERVER_ERROR);
		Log.error("message handler failed with", e);
	}
}
