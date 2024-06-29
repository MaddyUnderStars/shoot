import { EventEmitter } from "events";
import http from "http";
import ws from "ws";
import { config, createLogger, initDatabase } from "../util";
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

		await initJanus();

		Log.msg(`Connected to janus on ${config.webrtc.janus_url}`);

		if (!this.server.listening) this.server.listen(port);
	}
}
