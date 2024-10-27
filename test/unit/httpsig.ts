import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import sinon from "sinon";

test("Using Instance Actor", async (t) => {
	const { signWithHttpSignature, validateHttpSignature, InstanceActor } =
		await import("../../src/util");
	const { User } = await import("../../src/entity");

	const clock = sinon.useFakeTimers({
		now: new Date(2024, 1, 1),
		shouldClearNativeTimers: true,
	});

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

	clock.restore();
	t.pass();
});
