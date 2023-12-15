import bodyParser from "body-parser";
import express from "express";
import http from "http";
import morgan from "morgan";

import { authHandler, errorHandler, routes } from "./http";
import { createLogger, initDatabase } from "./util";

const Log = createLogger("server");

export class ChatServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

		this.app.use(bodyParser.json({ inflate: true }));
		this.app.use(
			bodyParser.json({
				type: "application/activity+json",
			}),
		);
		this.app.use(bodyParser.urlencoded({ inflate: true, extended: true }));

		this.app.use(morgan("combined"));

		this.app.use(authHandler);

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
