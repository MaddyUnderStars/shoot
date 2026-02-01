import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import "dotenv/config";
import { config } from "../util/config";
import { createLogger, setLogOptions } from "../util/log";
import { GatewayServer } from "./server";

setLogOptions(config().log);
const Log = createLogger("bootstrap");

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3002;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const gateway = new GatewayServer();

gateway.listen(PORT);
