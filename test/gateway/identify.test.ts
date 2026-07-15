import type { READY } from "../../src/gateway/util/validation/send.js";
import { test } from "../fixture.js";
import { FakeSocket, sendGatewayPayload } from "../testUtils/gateway.js";
import { createTestUser } from "../testUtils/users.js";

test("Can identify", async ({ api, expect }) => {
	const user = await createTestUser(api);

	const socket = new FakeSocket();

	const ready = await sendGatewayPayload(
		{
			t: "identify",
			token: user.token,
		},
		socket,
	);

	expect((ready.d as READY).user.mention).toBe(user.user.mention);
	// TODO: other validation...
});
