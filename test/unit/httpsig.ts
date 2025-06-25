import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import type { APActivity } from "activitypub-types";
import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

test("Using Instance Actor", async (t) => {
	const { signWithHttpSignature, validateHttpSignature } = await import(
		"../../src/util/activitypub/httpsig"
	);
	const { User } = await import("../../src/entity/user");
	const { InstanceActor } = await import(
		"../../src/util/activitypub/instanceActor"
	);

	const actor = await User.create({
		...InstanceActor,
		name: "remote_user",
		remote_address: "http://localhost/users/remote_user",
		id: undefined,
	}).save();

	const signed = signWithHttpSignature(
		"https://chat.understars.dev/inbox",
		"GET",
		actor,
	);

	await validateHttpSignature(
		"/inbox",
		"GET",
		//@ts-ignore
		signed.headers,
	);

	t.pass();
});

test("Using Instance Actor with Activity", async (t) => {
	const { signWithHttpSignature, validateHttpSignature } = await import(
		"../../src/util/activitypub/httpsig"
	);
	const { User } = await import("../../src/entity/user");
	const { InstanceActor } = await import(
		"../../src/util/activitypub/instanceActor"
	);

	const actor = await User.create({
		...InstanceActor,
		name: "remote_user2",
		remote_address: "http://localhost/users/remote_user2",
		id: undefined,
	}).save();

	const activity: APActivity = {
		id: "http://localhost/test_activity",
		attributedTo: "http://localhost/users/remote_user2",
		type: "Test",
	};

	const signed = signWithHttpSignature(
		"https://chat.understars.dev/inbox",
		"GET",
		actor,
		JSON.stringify(activity),
	);

	await validateHttpSignature(
		"/inbox",
		"GET",
		//@ts-ignore
		signed.headers,
		JSON.stringify(activity),
	);

	t.pass();
});
