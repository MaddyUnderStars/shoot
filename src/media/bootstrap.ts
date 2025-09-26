import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import "dotenv/config";
import { config } from "../util/config";
import { createLogger, setLogOptions } from "../util/log";
import { MediaGatewayServer } from "./server";

setLogOptions(config.log);
const Log = createLogger("bootstrap");

const MEDIA_PORT = process.env.MEDIA_PORT
	? Number.parseInt(process.env.MEDIA_PORT, 10)
	: 3003;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const media = new MediaGatewayServer();

media.listen(MEDIA_PORT);
