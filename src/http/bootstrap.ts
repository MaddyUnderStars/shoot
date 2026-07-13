import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import { config } from "../util/config.js";
import { createLogger, setLogOptions } from "../util/log.js";
import { APIServer } from "./server.js";

setLogOptions(config().log);
const Log = createLogger("bootstrap");

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3001;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const api = new APIServer();

void api.listen(PORT);
