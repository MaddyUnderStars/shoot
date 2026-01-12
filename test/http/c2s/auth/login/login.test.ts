import request from "supertest";
import { test } from "../../../../fixture";

test.sequential("Happy", async ({ api, expect }) => {
	const { registerUser } = await import(
		"../../../../../src/util/entity/user"
	);

	await registerUser("test", "test");

	const res = await request(api.app)
		.post("/auth/login")
		.send({
			username: "test",
			password: "test",
		})
		.expect(200);

	expect(res.body.token).toBeTypeOf("string");
});

test.sequential("Invalid password", async ({ api }) => {
	await request(api.app)
		.post("/auth/login")
		.send({
			username: "test",
			password: "incorrect",
		})
		.expect(401);
});

test.sequential("Invalid username", async ({ api }) => {
	await request(api.app)
		.post("/auth/login")
		.send({
			username: "incorrect",
			password: "incorrect",
		})
		.expect(401);
});
