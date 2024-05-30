import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../../helpers";
setupTests(test);

import request from "supertest";

test("Hostmeta", async (t) => {
	const { APIServer } = await import("../../../src/http/server");
	const api = new APIServer();

	const res = await request(api.app)
		.get("/.well-known/host-meta")
		.expect(200);

	t.snapshot(res.text);
});
