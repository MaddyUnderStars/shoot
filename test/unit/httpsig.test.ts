import { APActivity } from "@shootpub/activitypub-types/activity";
import { test } from "../fixture.js";

test("Using Instance Actor", async ({ api: _ }) => {
	const { signWithHttpSignature, validateHttpSignature } =
		await import("../../src/util/activitypub/httpsig.js");
	const { User } = await import("../../src/entity/user.js");
	const { InstanceActor } = await import("../../src/util/activitypub/instanceActor.js");

	const actor = await User.create({
		// oxlint-disable-next-line typescript/no-misused-spread
		...InstanceActor,
		name: "remote_user",
		remote_address: "http://localhost/users/remote_user",
		id: undefined,
	}).save();

	const signed = signWithHttpSignature("https://chat.understars.dev/inbox", "GET", actor);

	await validateHttpSignature(
		"/inbox",
		"GET",
		//@ts-expect-error
		signed.headers,
	);
});

test("Using Instance Actor with Activity", async ({ api: _ }) => {
	const { signWithHttpSignature, validateHttpSignature } =
		await import("../../src/util/activitypub/httpsig.js");
	const { User } = await import("../../src/entity/user.js");
	const { InstanceActor } = await import("../../src/util/activitypub/instanceActor.js");

	const actor = await User.create({
		// oxlint-disable-next-line typescript/no-misused-spread
		...InstanceActor,
		name: "remote_user2",
		remote_address: "http://localhost/users/remote_user2",
		id: undefined,
	}).save();

	const activity: APActivity = {
		id: "http://localhost/test_activity",
		attributedTo: "http://localhost/users/remote_user2",
		type: "Test",
		actor: "http://localhost/users/remote_user2",
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
