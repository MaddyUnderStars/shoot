import request from "supertest";
import { describe } from "vitest";
import { test } from "../../../../fixture.js";

describe("Registration is disabled", () => {
	test.beforeEach(({ config }) => {
		config.registration.enabled = false;
	});

	test("Cannot register without token", async ({ api }) => {
		await request(api.app)
			.post("/auth/register")
			.send({
				username: "test",
				password: "test",
				email: "test@test.com",
			})
			.set("Accept", "application/json")
			.expect(400);
	});

	test("Can register with token", async ({ api, dbClient, expect }) => {
		await dbClient.query("INSERT INTO instance_invites (code) VALUES ($1)", ["testinvite"]);

		await request(api.app)
			.post("/auth/register")
			.send({
				username: "test",
				password: "test",
				email: "test@test.com",
				invite: "testinvite",
			})
			.set("Accept", "application/json")
			.expect(302);

		const dbres = await dbClient.query("SELECT * FROM users WHERE name = $1", ["test"]);

		expect(dbres.rows[0]).toBeTruthy();
	});
});
