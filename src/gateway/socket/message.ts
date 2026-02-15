import { z } from "zod";
import { handlers } from "../handlers";
import type { Websocket } from "../util/websocket";

export async function onMessage(this: Websocket, event: MessageEvent) {
	const parsed = validate(event.data);

	const handler = handlers[parsed.t];
	if (!handler) throw new Error("invalid opcode");

	await handler.call(this, parsed);
}

const GatewayPayload = z.looseObject({
	t: z.string(),
});

const validate = (message: unknown) => {
	let ret: unknown;
	if (typeof message === "string") ret = JSON.parse(message);
	else throw new Error("unimplemented");

	return GatewayPayload.parse(ret);
};
