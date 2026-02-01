import { EventEmitter } from "node:stream";
import type { GATEWAY_PAYLOAD } from "../../src/gateway/util/validation/send";

export class FakeSocket extends EventEmitter {
	sequence = 0;
	events = {};
	member_list = {
		events: {},
	};
	ip_address = "127.0.0.1";
	auth_timeout = undefined;
	heartbeat_timeout = undefined;

	public send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
		this.emit("message", data);
	}

	public close(code?: number) {
		this.emit("close", code);
		Object.values(this.events).map((x) => (x as () => void)());
		this.removeAllListeners();
	}
}

export const sendGatewayPayload = async (
	payload: object,
	socket: EventEmitter,
): Promise<GATEWAY_PAYLOAD> => {
	const { onMessage } = await import("../../src/gateway/socket/message");

	const ret = new Promise<GATEWAY_PAYLOAD>((resolve) => {
		socket.once("message", (msg) => resolve(msg));
	});

	//@ts-expect-error
	await onMessage.call(socket, { data: JSON.stringify(payload) });

	return ret;
};
