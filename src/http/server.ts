import http from "node:http";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "node:path";

import { config } from "../util/config.js";
import { initDatabase } from "../util/database.js";
import { initRabbitMQ } from "../util/events.js";
import { createLogger, createLogStream } from "../util/log.js";
import { errorHandler } from "./middleware/error.js";
import routes, { isFederationRequest } from "./routes.js";
import { engine } from "express-handlebars";

const Log = createLogger("API");

export class APIServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

		this.app.use(cors());

		this.app.set("trust proxy", config().security.trust_proxy);

		morgan.token("mode", (req) => (isFederationRequest(req.headers) ? "fed" : "api"));

		morgan.token("type", (req) => req.headers["content-type"]);
		morgan.token("accept", (req) => req.headers.accept);

		if (config().http.log)
			this.app.use(
				morgan(config().http.log_format, {
					stream: createLogStream("HTTP"),
					skip(_req, res) {
						const log = config().http.log;
						const skip = log?.includes(res.statusCode.toString()) ?? false;
						return log?.charAt(0) === "-" ? skip : !skip;
					},
				}),
			);

		this.app.engine("handlebars", engine());
		this.app.set("view engine", "handlebars");
		this.app.set(
			"views",
			path.join(import.meta.filename, "..", "..", "..", "..", "assets", "views"),
		);

		this.app.use(
			"/public",
			express.static(
				path.join(import.meta.filename, "..", "..", "..", "..", "assets", "public"),
			),
		);

		this.app.use("/", routes);

		this.app.use(errorHandler);

		this.server = server ?? http.createServer();
		this.server.on("request", this.app);
	}

	public async listen(port: number) {
		this.server.on("listening", () => {
			Log.msg(`Listening on port ${port}`);
		});

		await initDatabase();
		await initRabbitMQ(false);

		if (!this.server.listening) this.server.listen(port);
	}
}
