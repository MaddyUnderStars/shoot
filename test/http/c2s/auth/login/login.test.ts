import request from "supertest";
import { test } from "../../../../fixture.js";

test("Can Login", { concurrent: false }, async ({ api, expect }) => {
	const { registerUser } = await import("../../../../../src/util/entity/user.js");

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

test("Login rejects invalid password", { concurrent: false }, async ({ api }) => {
	await request(api.app)
		.post("/auth/login")
		.send({
			username: "test",
			password: "incorrect",
		})
		.expect(401);
});

test("Login rejects invalid username", { concurrent: false }, async ({ api }) => {
	await request(api.app)
		.post("/auth/login")
		.send({
			username: "incorrect",
			password: "incorrect",
		})
		.expect(401);
});
