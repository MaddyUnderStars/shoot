import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { createTestDm, createTestUser, setupTests } from "../helpers";
setupTests(test);

import request from "supertest";

test("Get valid media token", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const user1 = await createTestUser("user1");
	const user2 = await createTestUser("user2");
	const dm = await createTestDm("dm", "user1@localhost", ["user2@localhost"]);

	const { body } = await request(api.app)
		.post(`/channel/${dm.mention}/call`)
		.auth(user1, { type: "bearer" })
		.expect(200);

	const { validateMediaToken } = await import("../../src/util/voice");

	await validateMediaToken(body.token);

	t.pass();
});
