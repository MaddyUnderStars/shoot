import request from "supertest";
import { test } from "../../../../../../fixture";
import { createTestGuild } from "../../../../../../testUtils/guilds";
import { createTestUser } from "../../../../../../testUtils/users";

test("Can update guild member object", async ({ api, expect }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	const res = await request(api.app)
		.patch(`/guild/${guild.mention}/members/${user.user.mention}`)
		.auth(user.token, { type: "bearer" })
		.send({
			nickname: "test nickname",
		});

	expect(res.body.nickname).toBe("test nickname");
});
