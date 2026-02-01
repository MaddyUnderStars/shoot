import request from "supertest";
import { describe } from "vitest";
import { test } from "../../../../fixture";

describe("Registration is enabled", () => {
	test("Can register without token", async ({ api }) => {
		await request(api.app)
			.post("/auth/register")
			.send({
				username: "test",
				password: "test",
				email: "test@test.com",
			})
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200);
	});
});
