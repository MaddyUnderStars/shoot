import request from "supertest";
import { test } from "../../../../fixture";
import { createTestUser } from "../../../../testUtils/users";

test("Get @me", async ({ api, expect }) => {
	const user = await createTestUser(api);

	const res = await request(api.app)
		.get("/users/@me")
		.auth(user.token, { type: "bearer" })
		.expect(200);

	expect(res.body.display_name).toBe(user.user.display_name);
	expect(res.body.mention).toBe(user.user.mention);
	expect(res.body.name).toBe(user.user.name);
});
