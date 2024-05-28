import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { createTestDm, createTestUser, setupTests } from "../../helpers";
setupTests(test);

import request from "supertest";

test("finds users", async (t) => {
	const { APIServer } = await import("../../../src/http/server");
	const api = new APIServer();

	await createTestUser("wf_user1");

	const res = await request(api.app)
		.get("/.well-known/webfinger?resource=wf_user1@localhost")
		.expect(200);

	t.snapshot(res.body);
});

// TODO: Finding channels and guilds via webfinger
// should require a http sig for a user with access to the resource
test("finds channels", async (t) => {
	const { APIServer } = await import("../../../src/http/server");
	const api = new APIServer();

	await createTestUser("wf_c_user1");
	await createTestUser("wf_c_user2");

	const dm = await createTestDm("dm", "wf_c_user1@localhost", [
		"wf_c_user2@localhost",
	]);

	dm.id = "d9a9e2ac-e077-4f4d-8f30-6844a87e2686"; // known id for snapshot
	await dm.save();

	const res = await request(api.app)
		.get(`/.well-known/webfinger?resource=${dm.id}@localhost`)
		.expect(200);

	t.snapshot(res.body);
});
