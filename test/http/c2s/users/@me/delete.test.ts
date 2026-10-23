import request from "supertest";
import { test } from "../../../../fixture.js";
import { createTestUser } from "../../../../testUtils/users.js";

test("Delete user", async ({ api }) => {
	const user = await createTestUser(api);

	await request(api.app)
		.post("/users/@me/delete")
		.auth(user.token, { type: "bearer" })
		.send({
			password: "wrong password",
		})
		.expect(401);

	await request(api.app)
		.post("/users/@me/delete")
		.auth(user.token, { type: "bearer" })
		.send({
			password: user.password,
		})
		.expect(202);

	// oxfmt-ignore
	await request(api.app)
		.get("/users/@me")
		.auth(user.token, { type: "bearer" })
		.expect(401);
});

// all data is cascade delete iirc
// so deleting a user will delete all their messages, channels, guilds
// need to test that the above works
test.todo("Delete user with data");
