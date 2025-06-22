import type { EventEmitter } from "node:events";
import http from "node:http";
import ws from "ws";
import { initDatabase } from "../util/database";
import { createLogger } from "../util/log";
import { onConnection } from "./socket/connection";
import { initJanus } from "./util/janus";

const Log = createLogger("MEDIA");

export class MediaGatewayServer {
	server: http.Server;
	socket: ws.Server;
	janus: EventEmitter;

	public constructor(server?: http.Server) {
		this.server = server ?? http.createServer();

		this.socket = new ws.Server({
			server: this.server,
		});

		this.socket.on("connection", onConnection);
	}

	public async listen(port: number) {
		this.server.on("listening", () => {
			Log.msg(`Listening on port ${port}`);
		});

		await initDatabase();

		try {
			await initJanus();
		} catch (e) {
			Log.error("Failed to connect to Janus. Webrtc will be unavailable");
			return;
		}

		if (!this.server.listening) this.server.listen(port);
	}
}
