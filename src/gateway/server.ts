import http from "node:http";
import ws from "ws";
import { initDatabase } from "../util/database";
import { initRabbitMQ } from "../util/events";
import { createLogger } from "../util/log";
import { onConnection } from "./socket/connection";

const Log = createLogger("GATEWAY");

export class GatewayServer {
	server: http.Server;
	socket: ws.Server;

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
		await initRabbitMQ(true);

		if (!this.server.listening) this.server.listen(port);
	}
}
