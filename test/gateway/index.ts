import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import { EventEmitter } from "node:stream";
import { createTestDm } from "../helpers/channel";
import { createTestGuild } from "../helpers/guild";
import { createTestUser } from "../helpers/users";
import type {
	GATEWAY_PAYLOAD,
	MEMBERS_CHUNK,
	READY,
} from "../../src/gateway/util/validation";

class FakeSocket extends EventEmitter {
	sequence = 0;
	events = {};
	member_list = {
		events: {},
	};
	ip_address: "127.0.0.1";
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

const sendGatewayPayload = async (
	payload: object,
	socket: EventEmitter,
): Promise<GATEWAY_PAYLOAD> => {
	const { onMessage } = await import("../../src/gateway/socket/message");

	const ret = new Promise<GATEWAY_PAYLOAD>((resolve) => {
		socket.once("message", (msg) => resolve(msg));
	});

	//@ts-ignore
	await onMessage.call(socket, { data: JSON.stringify(payload) });

	return ret;
};

test("Identify", async (t) => {
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

	socket.close();
});

test.only("Request members", async (t) => {
	const user1 = await createTestUser("members_user1");
	await createTestUser("members_user2");
	const guild = await createTestGuild(
		"request members",
		"members_user1@localhost",
		["members_user2@localhost"],
	);

	const socket = new FakeSocket();

	await sendGatewayPayload({ t: "identify", token: user1 }, socket);

	const res = await sendGatewayPayload(
		{
			t: "members",
			channel_id: guild.channels[0].mention,
			range: [0, 100],
		},
		socket,
	);

	const data = res.d as MEMBERS_CHUNK;

	t.is(data.items[0], guild.id); // @everyone is guild id
	t.assert(
		typeof data.items[1] !== "string" &&
			data.items[1].name === "members_user1",
	);
	t.assert(
		typeof data.items[2] !== "string" &&
			data.items[2].name === "members_user2",
	);

	socket.close();
});
