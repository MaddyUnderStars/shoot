import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { createTestUser, setupTests } from "../../helpers";
setupTests(test);

import request from "supertest";

test("Can edit own user", async (t) => {
	const token = await createTestUser("me");

	const { APIServer } = await import("../../../src/http/server");
	const api = new APIServer();

	await request(api.app)
		.patch("/users/@me")
		.auth(token, { type: "bearer" })
		.send({
			display_name: "me edited",
			summary: "this is a test",
		})
		.expect(200);

	await request(api.app)
		.get("/users/@me")
		.auth(token, { type: "bearer" })
		.expect(200)
		.then((response) => {
			t.is(response.body.display_name, "me edited");
			t.is(response.body.summary, "this is a test");
		});
});
