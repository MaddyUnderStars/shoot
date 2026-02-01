import request from "supertest";
import { test } from "../../../../fixture";
import { createTestUser } from "../../../../testUtils/users";

test("Get @me", async ({ api, expect }) => {
	const user = await createTestUser(api);

	await request(api.app)
		.patch("/users/@me")
		.auth(user.token, { type: "bearer" })
		.send({
			display_name: "test name",
			summary: "yoo",
		})
		.expect(200);

	const res = await request(api.app)
		.get("/users/@me")
		.auth(user.token, { type: "bearer" })
		.expect(200);

	expect(res.body.display_name).toBe("test name");
	expect(res.body.mention).toBe(user.user.mention);
	expect(res.body.name).toBe(user.user.name);
	expect(res.body.summary).toBe("yoo");
});
