import http, { IncomingMessage } from "http";
import ws from "ws";
import { createLogger, initDatabase } from "../util";
import { onClose } from "./socket/close";
import { onMessage } from "./socket/message";
import { Websocket, send } from "./util/websocket";

const Log = createLogger("GATEWAY");

export class GatewayServer {
	server: http.Server;
	socket: ws.Server;

	public constructor(server?: http.Server) {
		this.server = server ?? http.createServer();

		this.socket = new ws.Server({
			server: this.server,
		});

		this.socket.on("connection", this.onConnection);
	}

	public async listen(port: number) {
		this.server.on("listening", () => {
			Log.msg(`Listening on port ${port}`);
		});

		await initDatabase();

		if (!this.server.listening) this.server.listen(port);
	}

	private onConnection(
		this: ws.Server,
		socket: Websocket,
		request: IncomingMessage,
	) {
		// TODO: trust proxy

		//@ts-expect-error
		socket.raw_send = socket.send;
		socket.send = send.bind(socket);

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
				await onMessage.call(this as Websocket, ev);
			} catch (e) {
				this.close();
				Log.error(`message handler failed with`, e);
			}
		});

		// Trigger auth timeout after 10 seconds
		socket.auth_timeout = setTimeout(() => socket.close(), 10_000);
	}
}
