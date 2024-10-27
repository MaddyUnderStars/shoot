import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
import { createTestUser } from "../helpers/users";
setupTests(test);

import request from "supertest";
import { createTestGuild } from "../helpers/guild";

test("Leave guild", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const user = await createTestUser("leave");

	const guild = await createTestGuild("test guild", "leave@localhost", []);

	await request(api.app)
		.delete(`/users/@me/guild/${guild.mention}`)
		.auth(user, { type: "bearer" })
		.expect(200);

	t.pass();
});

test("Get as member", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const [user1, user2] = await Promise.all([
		createTestUser("user1"),
		createTestUser("user2"),
	]);

	const guild = await createTestGuild("test guild", "user1@localhost", [
		"user2@localhost",
	]);
	const expected = guild.toPublic();
	// biome-ignore lint/performance/noDelete:
	for (const ch of expected.channels || []) delete ch.guild_id;
	// biome-ignore lint/performance/noDelete:
	for (const r of expected.roles || []) delete r.guild_id;

	const res = await request(api.app)
		.get(`/guild/${guild.mention}`)
		.auth(user1, { type: "bearer" })
		.expect(200);

	t.deepEqual(res.body, expected);

	const res2 = await request(api.app)
		.get(`/guild/${guild.mention}`)
		.auth(user2, { type: "bearer" })
		.expect(200);

	t.deepEqual(res2.body, expected);
});

test("Get as non-member", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const [user1, user2] = await Promise.all([
		createTestUser("user3"),
		createTestUser("user4"),
	]);

	const guild = await createTestGuild("test guild", "user3@localhost", []);
	const expected = guild.toPublic();
	// biome-ignore lint/performance/noDelete:
	for (const ch of expected.channels || []) delete ch.guild_id;
	// biome-ignore lint/performance/noDelete:
	for (const r of expected.roles || []) delete r.guild_id;

	const res = await request(api.app)
		.get(`/guild/${guild.mention}`)
		.auth(user1, { type: "bearer" })
		.expect(200);

	t.deepEqual(res.body, expected);

	const res2 = await request(api.app)
		.get(`/guild/${guild.mention}`)
		.auth(user2, { type: "bearer" })
		.expect(404);

	t.pass();
});
