import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../../helpers/env";
setupTests(test);

import request from "supertest";
import { createTestUser } from "../../helpers/users";
import { createTestGuild } from "../../helpers/guild";

test("edit guild channel as owner", async (t) => {
	const { APIServer } = await import("../../../src/http/server");
	const api = new APIServer();

	const token = await createTestUser("me");

	const guild = await createTestGuild(
		"channel_edit_test",
		"me@localhost",
		[],
	);

	const general = guild.channels[0];

	await request(api.app)
		.patch(`/channel/${general.mention}`)
		.auth(token, { type: "bearer" })
		.send({
			name: "edited",
		})
		.expect(204);

	await request(api.app)
		.get(`/channel/${general.mention}`)
		.auth(token, { type: "bearer" })
		.expect(200)
		.then((response) => {
			t.is(response.body.name, "edited");
		});

	// TODO: need to test gateway events, too...
});
