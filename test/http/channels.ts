import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import request from "supertest";
import { createTestDm } from "../helpers/channel";
import { createTestUser } from "../helpers/users";

test("Get local", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const [user1] = await Promise.all([
		createTestUser("local1"),
		createTestUser("local2"),
	]);
	const dm = await createTestDm("localDm", "local1@localhost", [
		"local2@localhost",
	]);

	const ret = await request(api.app)
		.get(`/channel/${dm.mention}`)
		.auth(user1, { type: "bearer" })
		.expect(200);

	t.deepEqual(ret.body, dm.toPublic());
});

test("Get local as non-member", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const [, , user3] = await Promise.all([
		createTestUser("local3"),
		createTestUser("local4"),
		createTestUser("local5"),
	]);
	const dm = await createTestDm("localDm", "local3@localhost", [
		"local4@localhost",
	]);

	const ret = await request(api.app)
		.get(`/channel/${dm.mention}`)
		.auth(user3, { type: "bearer" })
		.expect(400);

	t.pass();
});
