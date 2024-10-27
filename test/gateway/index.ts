import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import { EventEmitter } from "node:stream";
import Sinon from "sinon";
import type { GATEWAY_PAYLOAD, READY } from "../../src/gateway/util";
import { createTestDm } from "../helpers/channel";
import { createTestUser } from "../helpers/users";

class FakeSocket extends EventEmitter {
	sequence = 0;
	events = {};
	ip_address: "127.0.0.1";
	auth_timeout = undefined;
	heartbeat_timeout = undefined;

	public send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
		this.emit("message", data);
	}

	public close(code?: number) {
		this.emit("close", code);
	}
}

const sendGatewayPayload = async (
	payload: object,
	socket: EventEmitter,
): Promise<GATEWAY_PAYLOAD> => {
	const { onMessage } = await import("../../src/gateway/socket/message");

	const ret = new Promise<GATEWAY_PAYLOAD>((resolve) => {
		socket.addListener("message", (msg) => resolve(msg));
	});

	//@ts-ignore
	await onMessage.call(socket, { data: JSON.stringify(payload) });

	return ret;
};

test("Identify", async (t) => {
	const clock = Sinon.useFakeTimers({
		now: new Date(2024, 1, 1),
		shouldClearNativeTimers: true,
	});

	const user1 = await createTestUser("user1");
	await createTestUser("user2");
	const dm = await createTestDm("dm", "user1@localhost", ["user2@localhost"]);

	const socket = new FakeSocket();

	const ready = await sendGatewayPayload(
		{ t: "identify", token: user1 },
		socket,
	);

	const data = ready.d as READY;

	t.is(ready.t, "READY");
	t.deepEqual(data.channels[0], { ...dm.toPublic() });
	t.is(data.user.name, "user1");
});
