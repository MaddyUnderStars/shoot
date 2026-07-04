import request from "supertest";
import { test } from "../../../fixture";
import { createTestGuild } from "../../../testUtils/guilds";
import { createTestUser } from "../../../testUtils/users";

test("Can create role in guild", async ({ api, expect }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	await request(api.app)
		.post(`/guild/${guild.mention}/roles`)
		.auth(user.token, { type: "bearer" })
		.send({
			name: "test role",
		})
		.expect(200);

	const res = await request(api.app)
		.get(`/guild/${guild.mention}`)
		.auth(user.token, { type: "bearer" })
		.expect(200);

	// everyone and the new role
	expect(res.body.roles).toHaveLength(2);
});

test.todo("Role ordering is correct");
