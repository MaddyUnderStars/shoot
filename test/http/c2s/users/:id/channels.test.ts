import request from "supertest";
import { describe } from "vitest";
import { test } from "../../../../fixture";
import { createTestUser } from "../../../../testUtils/users";

describe.sequential("DM channels", () => {
	let user1: Awaited<ReturnType<typeof createTestUser>>;
	let user2: Awaited<ReturnType<typeof createTestUser>>;
	let channel: string;

	test("Can create", async ({ api, expect }) => {
		[user1, user2] = await Promise.all([
			createTestUser(api),
			createTestUser(api),
		]);

		const createRes = await request(api.app)
			.post(`/users/${user2.user.mention}/channels`)
			.auth(user1.token, { type: "bearer" })
			.send({ name: "dm channel" })
			.expect(200);

		channel = createRes.body.mention;

		await request(api.app)
			.get("/users/@me/channels")
			.auth(user1.token, { type: "bearer" })
			.expect(200)
			.then((x) => {
				expect(
					x.body.find((i: { mention: string }) => i.mention).mention,
				).toBe(channel);
			});

		await request(api.app)
			.get("/users/@me/channels")
			.auth(user2.token, { type: "bearer" })
			.expect(200)
			.then((x) => {
				expect(
					x.body.find((i: { mention: string }) => i.mention).mention,
				).toBe(channel);
			});
	});

	test("Can send message", async ({ api, expect }) => {
		const sendRes = await request(api.app)
			.post(`/channel/${channel}/messages`)
			.auth(user1.token, { type: "bearer" })
			.send({ content: "test message" })
			.expect(200);

		await request(api.app)
			.get(`/channel/${channel}/messages`)
			.auth(user1.token, { type: "bearer" })
			.expect(200)
			.then((x) => {
				expect(x.body.find((i: { id: string }) => i.id).id).toBe(
					sendRes.body.id,
				);
			});

		await request(api.app)
			.get(`/channel/${channel}/messages`)
			.auth(user2.token, { type: "bearer" })
			.expect(200)
			.then((x) => {
				expect(x.body.find((i: { id: string }) => i.id).id).toBe(
					sendRes.body.id,
				);
			});
	});
});
