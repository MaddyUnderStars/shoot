import request from "supertest";
import { test } from "../../../../../fixture.js";
import { createTestGuild } from "../../../../../testUtils/guilds.js";
import { createTestUser } from "../../../../../testUtils/users.js";

test("Cannot access files outside of storage directory", async ({ api }) => {
	const owner = await createTestUser(api);

	const guild = await createTestGuild(owner);

	// Assuming the config has remained as `./storage` this should
	// resolve to `./readme.md` which is a real file
	await request(api.app)
		.get(`/channel/${guild.channels[0].mention}/attachments/..%2F..%2Freadme.md`)
		.expect(404);
});
