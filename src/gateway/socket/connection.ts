import { IncomingMessage } from "http";
import ws from "ws";

export function onConnection(
	this: ws.Server,
	socket: WebSocket,
	request: IncomingMessage,
) {}
