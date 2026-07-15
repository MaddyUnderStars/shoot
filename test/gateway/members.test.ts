import type { MEMBERS_CHUNK } from "../../src/gateway/util/validation/send.js";
import { test } from "../fixture.js";
import { FakeSocket, sendGatewayPayload } from "../testUtils/gateway.js";
import { createTestGuild } from "../testUtils/guilds.js";
import { createTestUser } from "../testUtils/users.js";

test("Can request guild members", async ({ api, expect }) => {
	const [user, user2] = await Promise.all([createTestUser(api), createTestUser(api)]);

	const guild = await createTestGuild(user);

	const { joinGuild } = await import("../../src/util/entity/guild.js");
	await joinGuild(user2.user.mention, guild.mention);

	const socket = new FakeSocket();

	await sendGatewayPayload({ t: "identify", token: user.token }, socket);

	const res = await sendGatewayPayload(
		{
			t: "members",
			channel_id: guild.channels[0].mention,
			range: [0, 100],
		},
		socket,
	);

	const data = res.d as MEMBERS_CHUNK;

	expect(data.items[0]).toBe(guild.id);
	expect(data.items.length).toBe(3);
});
