import http from "node:http";
import path from "node:path";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";

import { errorHandler } from "../http/middleware/error";
import { config } from "../util/config";
import { initDatabase } from "../util/database";
import { createLogger, createLogStream } from "../util/log";
import { getOidcProvider } from "./oidc";
import routes from "./routes/index";

const Log = createLogger("auth");

export class AuthServer {
	server: http.Server;
	app: express.Application;

	public constructor(server?: http.Server) {
		this.app = express();

		this.app.set("views", path.join(__dirname, "views"));
		this.app.set("view engine", "ejs");

		this.app.use(cors());

		this.app.set("trust proxy", config().security.trust_proxy);

		morgan.token("type", (req) => req.headers["content-type"]);
		morgan.token("accept", (req) => req.headers.accept);

		if (config().http.log)
			this.app.use(
				morgan(config().http.log_format, {
					stream: createLogStream("HTTP"),
					skip(_req, res) {
						const log = config().http.log;
						const skip =
							log?.includes(res.statusCode.toString()) ?? false;
						return log?.charAt(0) === "-" ? skip : !skip;
					},
				}),
			);

		this.app.use(bodyParser.json({ inflate: true }));
		this.app.use(bodyParser.urlencoded({ inflate: true, extended: true }));

		this.app.use(routes);

		this.app.use(getOidcProvider().callback());

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
