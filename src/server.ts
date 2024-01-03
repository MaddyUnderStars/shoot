import bodyParser from "body-parser";
import express from "express";
import http from "http";

import morgan from "morgan";
import { authHandler, errorHandler, routes } from "./http";
import { config, createLogger, initDatabase } from "./util";

const Log = createLogger("server");

export class ChatServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

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
						let skip =
							log!.includes(res.statusCode.toString()) ?? false;
						return log?.charAt(0) == "-" ? skip : !skip;
					},
				}),
			);

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
