import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import request from "supertest";

test("Register and login", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	await request(api.app)
		.post("/auth/register")
		.send({
			username: "registerTest",
			password: "test",
			email: "test@localhost.com",
		})
		.set("Accept", "application/json")
		.expect("Content-Type", /json/)
		.expect(200)
		.then((response) => t.assert(response.body.token));

	await request(api.app)
		.post("/auth/login")
		.send({
			username: "registerTest",
			password: "test",
		})
		.set("Accept", "application/json")
		.expect("Content-Type", /json/)
		.expect(200)
		.then((response) => t.assert(response.body.token));
});
