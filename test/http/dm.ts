import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import request from "supertest";
import { createTestDm } from "../helpers/channel";
import { createTestUser } from "../helpers/users";

test("Can create DM channels", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const user1 = await createTestUser("create_user1");
	const user2 = await createTestUser("create_user2");

	const res = await request(api.app)
		.post("/users/create_user2@localhost/channels")
		.auth(user1, { type: "bearer" })
		.send({ name: "dm channel" });

	t.is(res.status, 200);

	const channel_id = res.body.id;

	await request(api.app)
		.get("/users/@me/channels")
		.auth(user1, { type: "bearer" })
		.then((x) => {
			t.is(x.status, 200);
			t.assert(x.body.find((i: { id: string }) => i.id === channel_id));
		});

	await request(api.app)
		.get("/users/@me/channels")
		.auth(user2, { type: "bearer" })
		.then((x) => {
			t.is(x.status, 200);
			t.assert(x.body.find((i: { id: string }) => i.id === channel_id));
		});

	t.pass();
});

test("Can send messages to dm", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const user1 = await createTestUser("messages_user1");
	const user2 = await createTestUser("messages_user2");

	const channel = await createTestDm("dm", "messages_user1@localhost", [
		"messages_user2@localhost",
	]);

	const response = await request(api.app)
		.post(`/channel/${channel.mention}/messages`)
		.auth(user1, { type: "bearer" })
		.send({ content: "test message" });

	t.is(response.status, 200);

	const message_id = response.body.id;

	await request(api.app)
		.get(`/channel/${channel.mention}/messages`)
		.auth(user1, { type: "bearer" })
		.then((x) => {
			t.is(x.status, 200);
			t.assert(x.body.find((i: { id: string }) => i.id === message_id));
		});

	await request(api.app)
		.get(`/channel/${channel.mention}/messages`)
		.auth(user2, { type: "bearer" })
		.then((x) => {
			t.is(x.status, 200);
			t.assert(x.body.find((i: { id: string }) => i.id === message_id));
		});
});
