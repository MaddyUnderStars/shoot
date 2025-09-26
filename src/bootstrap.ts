import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import "dotenv/config";
import { createServer } from "node:http";
import { GatewayServer } from "./gateway/server";
import { APIServer } from "./http/server";
import { MediaGatewayServer } from "./media/server";

import { config } from "./util/config";
import { createLogger, setLogOptions } from "./util/log";

setLogOptions(config.log);
const Log = createLogger("bootstrap");
Log.msg("Starting");

// Check nodejs version
const NODE_REQUIRED_VERSION = 18;
const [NODE_MAJOR_VERSION] = process.versions.node.split(".").map(Number);
if (NODE_MAJOR_VERSION < NODE_REQUIRED_VERSION) {
	Log.error(
		`You are running node version ${NODE_MAJOR_VERSION}. We require a version > ${NODE_REQUIRED_VERSION}. Please upgrade.`,
	);
	process.exit(1);
}

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3001;
const MEDIA_PORT = process.env.MEDIA_PORT
	? Number.parseInt(process.env.MEDIA_PORT, 10)
	: 3003;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const http = createServer();

const api = new APIServer(http);
const gateway = new GatewayServer(http);

const media = new MediaGatewayServer();

Promise.all([api.listen(PORT), gateway.listen(PORT), media.listen(MEDIA_PORT)]);
