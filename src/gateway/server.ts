import http from "http";
import { WebSocketServer } from "ws";
import { createLogger, initDatabase } from "../util";
import { onConnection } from "./socket/connection";

const Log = createLogger("GATEWAY");

export class GatewayServer {
	server: http.Server;
	socket: WebSocketServer;

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

		if (!this.server.listening) this.server.listen(port);
	}
}
