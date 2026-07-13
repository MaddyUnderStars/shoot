import type { ZodSchema } from "zod";
import { createLogger } from "../../util/log.js";
import { CLOSE_CODES } from "../util/codes.js";
import type { Websocket } from "../util/websocket.js";

const Log = createLogger("gateway");

export type GatewayMessageHandler<T> = (this: Websocket, message: T) => unknown;

export const makeHandler = <T>(handler: GatewayMessageHandler<T>, schema: ZodSchema<T>) => {
	return function func(this: Websocket, data: T) {
		const ret = schema.safeParse(data);
		if (!ret.success) {
			Log.verbose(`${this.ip_address} sent malformed data`);
			this.close(CLOSE_CODES.BAD_PAYLOAD);
			return;
		}

		handler.call(this, data);
		return;
	};
};
