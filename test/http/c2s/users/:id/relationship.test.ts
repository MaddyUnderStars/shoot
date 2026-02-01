import request, { type Response } from "supertest";
import { describe } from "vitest";
import { test } from "../../../../fixture";
import { createTestUser } from "../../../../testUtils/users";

describe.sequential("Relationships", () => {
	let user1: Awaited<ReturnType<typeof createTestUser>>;
	let user2: Awaited<ReturnType<typeof createTestUser>>;

	let createRes: Response;

	test("Can request relationship", async ({ api }) => {
		[user1, user2] = await Promise.all([
			createTestUser(api),
			createTestUser(api),
		]);

		createRes = await request(api.app)
			.post(`/users/${user2.user.mention}/relationship`)
			.auth(user1.token, { type: "bearer" })
			.expect(200);
	});

	test("Can accept relationship", async ({ api, expect }) => {
		await request(api.app)
			.post(`/users/${user1.user.mention}/relationship`)
			.auth(user2.token, { type: "bearer" })
			.expect(200);

		const getRes = await request(api.app)
			.get(`/users/${user2.user.mention}/relationship`)
			.auth(user1.token, { type: "bearer" })
			.expect(200);

		expect(getRes.body).toMatchObject({
			...createRes.body,
			type: 1, // RelationshipType.accepted
		});
	});

	test("Can delete relationship", async ({ api }) => {
		await request(api.app)
			.delete(`/users/${user1.user.mention}/relationship`)
			.auth(user2.token, { type: "bearer" })
			.expect(200);

		await request(api.app)
			.get(`/users/${user1.user.mention}/relationship`)
			.auth(user2.token, { type: "bearer" })
			.expect(404);

		await request(api.app)
			.get(`/users/${user2.user.mention}/relationship`)
			.auth(user1.token, { type: "bearer" })
			.expect(404);
	});
});
