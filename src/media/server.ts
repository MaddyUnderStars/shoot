import EventEmitter from "events";
import http from "http";
import Janode from "janode";
import ws from "ws";
import { config, createLogger, initDatabase } from "../util";
import { onConnection } from "./socket/connection";

const Log = createLogger("GATEWAY");

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

		this.janus = await Janode.connect({
			address: {
				url: config.webrtc.janus_url,
				apisecret: config.webrtc.janus_secret,
			},
		});

		Log.msg(`Connected to janus on ${config.webrtc.janus_url}`);

		this.janus.once(Janode.EVENT.CONNECTION_CLOSED, () => {
			Log.error(`Janus closed, TOOD: retry`);
		});

		if (!this.server.listening) this.server.listen(port);
	}
}
