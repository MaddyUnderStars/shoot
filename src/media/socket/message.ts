import { z } from "zod";
import { handlers } from "../handlers";
import { MediaSocket } from "../util/websocket";

export async function onMessage(this: MediaSocket, event: MessageEvent<any>) {
	const parsed = validate(event.data);

	const handler = handlers[parsed.t];
	if (!handler) throw new Error("invalid opcode");

	await handler.call(this, parsed);
}

const GatewayPayload = z
	.object({
		t: z.string(),
	})
	.passthrough();

const validate = (message: any) => {
	let ret;
	if (typeof message == "string") ret = JSON.parse(message);
	else throw new Error("unimplemented");

	return GatewayPayload.parse(ret);
};
