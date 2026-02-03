import request from "supertest";
import { test } from "../../../fixture";
import { createTestGuild } from "../../../testUtils/guilds";
import { createTestUser } from "../../../testUtils/users";

test("Can edit role in guild", async ({ api }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	await request(api.app)
		.patch(`/role/${guild.id}`)
		.auth(user.token, { type: "bearer" })
		.send({
			deny: [0],
		})
		.expect(200);
});
