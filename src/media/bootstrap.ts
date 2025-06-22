import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import "dotenv/config";
import { createLogger } from "../util/log";
import { MediaGatewayServer } from "./server";

const Log = createLogger("bootstrap");

const MEDIA_PORT = process.env.MEDIA_PORT
	? Number.parseInt(process.env.MEDIA_PORT)
	: 3003;

process.on("uncaughtException", (error, origin) => {
	Log.error(`Caught ${origin}`, error);
});

const media = new MediaGatewayServer();

media.listen(MEDIA_PORT);
