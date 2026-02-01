import request from "supertest";
import { test } from "../../../../fixture";
import {
	getShootContainerUrl,
	startShootContainer,
} from "../../../../testUtils/container";
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

test(
	"Get foreign user by mention",
	{ timeout: 60_000 },
	async ({ expect, onTestFinished }) => {
		const [local, remote] = await Promise.all([
			startShootContainer(),
			startShootContainer(),
		]);

		onTestFinished(async () => {
			await Promise.all([local.stop(), remote.stop()]);
		});

		const [localUser, remoteUser] = await Promise.all([
			createTestUser(local),
			createTestUser(remote),
		]);

		const res = await fetch(
			new URL(
				`/users/${remoteUser.user.mention}`,
				getShootContainerUrl(local),
			),
			{
				headers: {
					Authorization: localUser.token,
				},
			},
		);

		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.mention).toBe(remoteUser.user.mention);
		expect(body.display_name).toBe(remoteUser.user.display_name);
		expect(body.name).toBe(remoteUser.user.name);
	},
);
