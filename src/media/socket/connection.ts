import type { IncomingMessage } from "node:http";
import type { WebSocketServer, WebSocket } from "ws";
import { CLOSE_CODES } from "../../gateway/util/codes.js";
import { createLogger } from "../../util/log.js";
import { type MediaSocket, send } from "../util/websocket.js";
import { onClose } from "./close.js";
import { onMessage } from "./message.js";

const Log = createLogger("media");

export function onConnection(this: WebSocketServer, socket: MediaSocket, request: IncomingMessage) {
	socket.sequence = 0;

	//@ts-expect-error
	socket.raw_send = socket.send;
	socket.send = send.bind(socket);

	// TODO: trust proxy
	const ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown";
	socket.ip_address = Array.isArray(ip) ? ip[0] : ip;

	Log.verbose(`New client from '${socket.ip_address}'`);

	socket.addEventListener("close", tryOnClose);

	socket.addEventListener("message", tryOnMessage);

	// Trigger auth timeout after 10 seconds
	socket.auth_timeout = setTimeout(socket.close, 10_000, CLOSE_CODES.IDENTIFY_TIMEOUT);
}

async function tryOnClose(this: MediaSocket, ev: WebSocket.CloseEvent) {
	try {
		await onClose.call(this, ev);
	} catch (e) {
		Log.error("close handler failed with", e);
	}
}

async function tryOnMessage(this: MediaSocket, ev: WebSocket.MessageEvent) {
	try {
		await onMessage.call(this, ev);
	} catch (e) {
		this.close(CLOSE_CODES.SERVER_ERROR);
		Log.error("message handler failed with", e);
	}
}
