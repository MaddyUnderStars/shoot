import http from "node:http";
import ws from "ws";
import { createLogger, initDatabase } from "../util";
import { onSubscribeMembers } from "./handlers/members";
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

		if (!this.server.listening) this.server.listen(port);

		onSubscribeMembers.call(
			//@ts-ignore
			{ user_id: "3d386332-41ba-4050-bff9-be3f336da79e" },
			{
				channel_id:
					"24da1b01-527b-4f1a-a351-704066f0482c@chat.understars.dev",
				range: [0, 100],
			},
		);
	}
}
