import { config } from "../util/config.js";
import { createLogger, setLogOptions } from "../util/log.js";
import { GatewayServer } from "./server.js";

setLogOptions(config().log);
const Log = createLogger("bootstrap");

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3002;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const gateway = new GatewayServer();

void gateway.listen(PORT);
