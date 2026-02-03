import request from "supertest";
import { test } from "../../../fixture";
import { createTestGuild } from "../../../testUtils/guilds";
import { createTestUser } from "../../../testUtils/users";

test("Can create role in guild", async ({ api }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	await request(api.app)
		.post(`/guild/${guild.mention}/roles`)
		.auth(user.token, { type: "bearer" })
		.send({
			name: "test role",
		})
		.expect(200);
});

test.todo("Role ordering is correct");
