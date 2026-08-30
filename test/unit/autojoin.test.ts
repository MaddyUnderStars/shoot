import request from "supertest";
import { test } from "../fixture.js";
import { createTestGuild } from "../testUtils/guilds.js";
import { createTestAccessToken, createTestUser } from "../testUtils/users.js";

test.describe("Via config", () => {
	test.beforeEach(async ({ config, api }) => {
		const owner = await createTestUser(api);
		const guild = await createTestGuild(owner);

		config.registration.auto_join = [guild.id];
	});

	test("Auto joins guilds", async ({ api, expect }) => {
		await request(api.app)
			.post("/auth/register")
			.send({
				username: "a",
				password: "test",
				email: "test@test.com",
			})
			.expect(302);

		const token = await createTestAccessToken(api, "a", "test");

		const guilds = await request(api.app)
			.get("/users/@me/guild")
			.auth(token, { type: "bearer" })
			.expect(200);

		expect(guilds.body).toHaveLength(1);
	});
});

test.describe("With registration token", () => {
	test.beforeEach(async ({ api, dbClient, config }) => {
		const owner = await createTestUser(api);
		const guild = await createTestGuild(owner);

		config.registration.auto_join = [];

		await dbClient.query(`INSERT INTO instance_invites (code, "guildId") VALUES ($1, $2)`, [
			"testinvite",
			guild.id,
		]);
	});

	test("Auto joins guilds", async ({ api, expect }) => {
		await request(api.app)
			.post("/auth/register")
			.send({
				username: "b",
				password: "test",
				email: "test@test.com",
				invite: "testinvite",
			})
			.expect(302);

		const token = await createTestAccessToken(api, "b", "test");

		const guilds = await request(api.app)
			.get("/users/@me/guild")
			.auth(token, { type: "bearer" })
			.expect(200);

		expect(guilds.body).toHaveLength(1);
	});
});
