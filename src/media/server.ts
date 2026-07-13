import type { EventEmitter } from "node:events";
import http from "node:http";
import { WebSocketServer } from "ws";
import { initDatabase } from "../util/database.js";
import { initRabbitMQ } from "../util/events.js";
import { createLogger } from "../util/log.js";
import { onConnection } from "./socket/connection.js";
import { initJanus } from "./util/janus.js";

const Log = createLogger("MEDIA");

export class MediaGatewayServer {
	server: http.Server;
	socket: WebSocketServer;
	janus: EventEmitter;

	public constructor(server?: http.Server) {
		this.server = server ?? http.createServer();

		this.socket = new WebSocketServer({
			server: this.server,
		});

		this.socket.on("connection", onConnection);
	}

	public async listen(port: number) {
		this.server.on("listening", () => {
			Log.msg(`Listening on port ${port}`);
		});

		await initDatabase();

		await initRabbitMQ(false);

		try {
			await initJanus();
		} catch {
			Log.error("Failed to connect to Janus. Webrtc will be unavailable");
			return;
		}

		if (!this.server.listening) this.server.listen(port);
	}
}
