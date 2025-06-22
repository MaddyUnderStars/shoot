import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import "dotenv/config";
import { createLogger } from "../util/log";
import { GatewayServer } from "./server";

const Log = createLogger("bootstrap");

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3002;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const gateway = new GatewayServer();

gateway.listen(PORT);
