import request from "supertest";
import { test } from "../../../../fixture";
import { startShootContainer } from "../../../../testUtils/container";
import { createTestUser } from "../../../../testUtils/users";

test("Get local user by mention", async ({ api, expect }) => {
	const [user1, user2] = await Promise.all([
		createTestUser(api),
		createTestUser(api),
	]);

	const res = await request(api.app)
		.get(`/users/${user2.user.mention}`)
		.auth(user1.token, { type: "bearer" })
		.expect(200);

	expect(res.body.display_name).toBe(user2.user.display_name);
	expect(res.body.mention).toBe(user2.user.mention);
	expect(res.body.name).toBe(user2.user.name);
});

test("Get foreign user by mention", { timeout: 60_000 }, async () => {
	const remote = await startShootContainer();

	await remote.stop();
});
