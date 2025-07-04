import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

import request from "supertest";
import { createTestDm } from "../helpers/channel";
import { createTestRemoteUser, createTestUser } from "../helpers/users";

// TODO: these tests fail because `makeInstanceUrl` uses the config
// and it's not overwritten when we're faking our signatures

test.skip("Create<Note> at channel", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	await createTestUser("local");
	const remote = await createTestRemoteUser("remote", "http://remote");
	const channel = await createTestDm("dm", "local@localhost", [
		"remote@remote",
	]);

	const { signWithHttpSignature } = await import(
		"../../src/util/activitypub/httpsig"
	);
	const { addContext } = await import("../../src/util/activitypub/util");
	const { buildAPNote, buildAPCreateNote } = await import(
		"../../src/util/activitypub/transformers/message"
	);
	const { Message } = await import("../../src/entity/message");

	const reference_message = Message.create({
		content: "test message",
		author: remote,
		published: new Date(),
		updated: new Date(),
		channel: channel,
	});

	const activity = JSON.parse(
		JSON.stringify(
			addContext(buildAPCreateNote(buildAPNote(reference_message))),
		).replaceAll("http://localhost", "http://remote"),
	);

	const signed = signWithHttpSignature(
		`http://localhost/channel/${channel.id}/inbox`,
		"POST",
		remote,
		activity,
	);

	//@ts-ignore
	signed.headers.signature = signed.headers?.signature.replace(
		"localhost",
		"remote",
	);
	//@ts-ignore
	// signed.headers!.host = "remote";

	await request(api.app)
		.post(`/channel/${channel.id}/inbox`)
		.set("accept", "application/activity+json")
		.set("content-type", "application/activity+json")
		//@ts-ignore
		.set(signed.headers)
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		.send(signed.body!)
		.expect(200);

	const actual = await Message.findOneOrFail({
		where: { channel: { id: channel.id } },
		relations: {
			author: true,
		},
	});

	t.is(actual.content, reference_message.content);
	t.is(actual.author.name, reference_message.author.name);
	t.is(actual.author.display_name, reference_message.author.display_name);
	t.is(actual.author.public_key, reference_message.author.public_key);
	// TODO: published/update dates
});

test.skip("Cannot Create<Note> to channel we are not members of", async (t) => {
	const { APIServer } = await import("../../src/http/server");
	const api = new APIServer();

	const local = await createTestUser("local2");
	const remote = await createTestRemoteUser("remote2", "http://remote");
	const notMember = await createTestRemoteUser("notMember", "http://remote");
	const channel = await createTestDm("dm", "local2@localhost", [
		"remote2@remote",
	]);

	const { signWithHttpSignature } = await import(
		"../../src/util/activitypub/httpsig"
	);
	const { addContext } = await import("../../src/util/activitypub/util");
	const { buildAPNote, buildAPCreateNote } = await import(
		"../../src/util/activitypub/transformers/message"
	);
	const { Message } = await import("../../src/entity/message");

	const reference_message = Message.create({
		content: "test message",
		author: notMember,
		published: new Date(),
		updated: new Date(),
		channel: channel,
	});

	const activity = JSON.parse(
		JSON.stringify(
			addContext(buildAPCreateNote(buildAPNote(reference_message))),
		).replaceAll(
			"http://localhost/users/notMember",
			"http://remote/users/notMember",
		),
	);

	const signed = signWithHttpSignature(
		`http://localhost/channel/${channel.id}/inbox`,
		"POST",
		notMember,
		activity,
	);

	//@ts-ignore
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	signed.headers!.signature = signed.headers?.signature.replace(
		"localhost",
		"remote",
	);
	//@ts-ignore
	// signed.headers!.host = "remote";

	await request(api.app)
		.post(`/channel/${channel.id}/inbox`)
		.set("accept", "application/activity+json")
		.set("content-type", "application/activity+json")
		//@ts-ignore
		.set(signed.headers)
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		.send(signed.body!)
		.expect(400);

	t.pass();
});
