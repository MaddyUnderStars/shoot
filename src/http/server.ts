import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import http from "node:http";

import { errorHandler, routes } from ".";
import { config, createLogStream, createLogger, initDatabase } from "../util";
import { isFederationRequest } from "./routes";

const Log = createLogger("API");

export class APIServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

		this.app.use(cors());

		this.app.set("trust proxy", config.security.trust_proxy);

		morgan.token("mode", (req) =>
			isFederationRequest(req.headers) ? "fed" : "api",
		);

		morgan.token("type", (req) => req.headers["content-type"]);
		morgan.token("accept", (req) => req.headers.accept);

		if (config.http.log)
			this.app.use(
				morgan(config.http.log_format, {
					stream: createLogStream("HTTP"),
					skip(req, res) {
						const log = config.http.log;
						const skip =
							log?.includes(res.statusCode.toString()) ?? false;
						return log?.charAt(0) === "-" ? skip : !skip;
					},
				}),
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

		if (!this.server.listening) this.server.listen(port);
	}
}
