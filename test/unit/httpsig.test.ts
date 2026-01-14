import type { APActivity } from "activitypub-types";
import { test } from "../fixture";

test("Using Instance Actor", async ({ api }) => {
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
		//@ts-expect-error
		signed.headers,
	);
});

test("Using Instance Actor with Activity", async ({ api }) => {
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
		//@ts-expect-error
		signed.headers,
		JSON.stringify(activity),
	);
});
