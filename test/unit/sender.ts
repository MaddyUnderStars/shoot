import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import Sinon from "sinon";

import test from "ava";
import { createTestRemoteUser, setupTests } from "../helpers";
setupTests(test);

test("Sends to shared inboxes", async (t) => {
	const { sendActivity } = await import("../../src/sender");

	const actors = await Promise.all([
		createTestRemoteUser("remote", "https://example.com"),
		createTestRemoteUser("remote2", "https://example.com"),
		createTestRemoteUser("other", "https://other.example.com"),
		createTestRemoteUser("another", "https://another.example.com"),
	]);

	const expected = [
		"https://example.com/inbox",
		"https://other.example.com/users/other/inbox",
		"https://another.example.com/users/another/inbox",
	];

	t.plan(expected.length);

	Sinon.stub(globalThis, "fetch").callsFake((url) => {
		t.assert(expected.includes(url.toString()));
		return Promise.resolve(new Response(null, { status: 202 }));
	});

	await sendActivity(actors, { type: "ping" });
});
