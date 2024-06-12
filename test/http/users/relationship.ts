import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { createTestUser, setupTests } from "../../helpers";
setupTests(test);

import request from "supertest";
import { RelationshipType } from "../../../src/entity";

test("Create and delete", async (t) => {
	const { APIServer } = await import("../../../src/http/server");
	const api = new APIServer();

	const user1 = await createTestUser("create1");
	const user2 = await createTestUser("create2");

	const res1 = await request(api.app)
		.post(`/users/create2@localhost/relationship`)
		.auth(user1, { type: "bearer" })
		.expect(200);

	const res2 = await request(api.app)
		.post(`/users/create1@localhost/relationship`)
		.auth(user2, { type: "bearer" })
		.expect(200);

	t.deepEqual(
		(
			await request(api.app)
				.get("/users/create2@localhost/relationship")
				.auth(user1, { type: "bearer" })
				.expect(200)
		).body,
		{ ...res1.body, type: RelationshipType.accepted },
	);

	t.deepEqual(
		(
			await request(api.app)
				.get("/users/create1@localhost/relationship")
				.auth(user2, { type: "bearer" })
				.expect(200)
		).body,
		{ ...res2.body, type: RelationshipType.accepted },
	);
});
