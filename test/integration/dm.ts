import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { createTestUser, setupTests } from "../helpers";
setupTests(test);

import request from "supertest";

test("Can create DM channels", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const user1 = await createTestUser("user1");
	const user2 = await createTestUser("user2");

	const res = await request(api.app)
		.post(`/users/user2@localhost/channels`)
		.auth(user1, { type: "bearer" })
		.send({ name: "dm channel" })
		.expect(200);

	const channel_id = res.body.id;

	await request(api.app)
		.get("/users/@me/channels")
		.auth(user1, { type: "bearer" })
		.expect(200)
		.then((x) => t.assert(x.body.find((i: any) => i.id == channel_id)));

	await request(api.app)
		.get("/users/@me/channels")
		.auth(user2, { type: "bearer" })
		.expect(200)
		.then((x) => t.assert(x.body.find((i: any) => i.id == channel_id)));

	t.pass();
});
