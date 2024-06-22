import { ZodSchema } from "zod";
import { CLOSE_CODES } from "../../gateway/util";
import { createLogger } from "../../util";
import { MediaSocket } from "../util/websocket";

const Log = createLogger("gateway");

export type GatewayMessageHandler<T> = (
	this: MediaSocket,
	message: T,
) => Promise<unknown> | unknown;

export const makeHandler = <T>(
	handler: GatewayMessageHandler<T>,
	schema: ZodSchema<T>,
) => {
	return function func(this: MediaSocket, data: T) {
		const ret = schema.safeParse(data);
		if (!ret.success) {
			Log.verbose(`${this.ip_address} sent malformed data`);
			this.close(CLOSE_CODES.BAD_PAYLOAD);
			return;
		}

		return handler.call(this, data as T);
	};
};

export const handlers: Record<string, GatewayMessageHandler<any>> = {
	identify: require("./identify").onIdentify,
	heartbeat: require("./heartbeat").onHeartbeat,
};
