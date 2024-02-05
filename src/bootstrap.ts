import "dotenv/config";
import { createServer } from "http";
import { GatewayServer } from "./gateway/server";
import { APIServer } from "./http/server";
import { createLogger } from "./util";

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

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const http = createServer();

const api = new APIServer(http);
const gateway = new GatewayServer(http);

Promise.all([api.listen(PORT), gateway.listen(PORT)]);
