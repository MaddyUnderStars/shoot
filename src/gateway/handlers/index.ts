import { ZodSchema } from "zod";
import { createLogger } from "../../util";
import { Websocket } from "../util/websocket";

const Log = createLogger("gateway");

export type GatewayMessageHandler<T> = (
	this: Websocket,
	message: T,
) => Promise<unknown> | unknown;

export const makeHandler = <T>(
	handler: GatewayMessageHandler<T>,
	schema: ZodSchema<T>,
) => {
	return function func(this: Websocket, data: T) {
		const ret = schema.safeParse(data);
		if (!ret.success) {
			Log.verbose(`${this.ip_address} sent malformed data`);
			this.close();
			return;
		}

		return handler.call(this, data as T);
	};
};

export const handlers: Record<string, GatewayMessageHandler<any>> = {
	identify: require("./identify").onIdentify,
};
