import request from "supertest";
import { test } from "../../../../fixture";
import { createTestUser } from "../../../../testUtils/users";

test("Create, Accept, Delete", async ({ api, expect }) => {
	const [user1, user2] = await Promise.all([
		createTestUser(api),
		createTestUser(api),
	]);

	const createRes = await request(api.app)
		.post(`/users/${user2.user.mention}/relationship`)
		.auth(user1.token, { type: "bearer" })
		.expect(200);

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
