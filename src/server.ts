import bodyParser from "body-parser";
import express from "express";
import http from "http";

import { errorHandler, routes } from "./http";
import { createLogger, initDatabase } from "./util";

const Log = createLogger("server");

export class ChatServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

		this.app.use(bodyParser.json());

		this.app.use("/", routes);

		this.app.use(errorHandler);

		this.server = server ?? http.createServer();
		this.server.on("request", this.app);
	}

	public async listen(port: number) {
		await initDatabase();

		this.server.on("listening", () => {
			Log.msg(`Listening on port ${port}`);
		});
		this.server.listen(port);
	}
}
