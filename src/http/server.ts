import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import http from "node:http";

import { errorHandler, routes } from ".";
import { config, createLogger, initDatabase } from "../util";

const Log = createLogger("API");

export class APIServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

		this.app.use(cors());

		this.app.set("trust proxy", config.security.trust_proxy);

		this.app.use(bodyParser.json({ inflate: true }));
		this.app.use(
			bodyParser.json({
				type: "application/activity+json",
			}),
		);
		this.app.use(bodyParser.urlencoded({ inflate: true, extended: true }));

		if (config.http.log)
			this.app.use(
				morgan("combined", {
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
