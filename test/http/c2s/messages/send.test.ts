import request from "supertest";
import { v7 as uuidv7 } from "uuid";
import { PERMISSION } from "../../../../src/util/permission";
import { test } from "../../../fixture";
import { createTestGuild } from "../../../testUtils/guilds";
import { createTestUser, type TestUser } from "../../../testUtils/users";

test.for([
	[[PERMISSION.OWNER], true],
	[[PERMISSION.ADMIN], true],
	[[PERMISSION.SEND_MESSAGES, PERMISSION.VIEW_CHANNEL], true],
	[[PERMISSION.VIEW_CHANNEL], false],
	[[PERMISSION.SEND_MESSAGES], false],
	[[PERMISSION.NONE], false],
])("Can send messages as $0", async (opts, { api, dbClient }) => {
	const permissions = opts[0] as PERMISSION[];
	const allowed = opts[1] as boolean;

	const owner = await createTestUser(api);

	const guild = await createTestGuild(owner);

	let user: TestUser;

	if (permissions.includes(PERMISSION.OWNER)) user = owner;
	else {
		// have to create a new user and add them here
		user = await createTestUser(api);

		const { joinGuild } = await import("../../../../src/util/entity/guild");
		await joinGuild(user.user.mention, guild.mention);

		// TODO: there's no route to give this user the role yet
		// so just give the permission to @everyone
		await dbClient.query(
			"UPDATE roles SET allow = $1::roles_allow_enum[] WHERE id = $2",
			[permissions, guild.id],
		);
	}

	await request(api.app)
		.post(`/channel/${guild.channels[0].mention}/messages`)
		.auth(user.token, { type: "bearer" })
		.send({
			content: "hi!",
		})
		.expect(allowed ? 200 : 400);
});

test("Cannot send duplicate messages", async ({ api, expect }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	const nonce = uuidv7();

	const msg = await request(api.app)
		.post(`/channel/${guild.channels[0].mention}/messages`)
		.auth(user.token, { type: "bearer" })
		.send({
			nonce,
			content: "hi!",
		})
		.expect(200);

	const duplicate = await request(api.app)
		.post(`/channel/${guild.channels[0].mention}/messages`)
		.auth(user.token, { type: "bearer" })
		.send({
			nonce,
			content: "ignored message",
		})
		.expect(200);

	expect(duplicate.body).toEqual(msg.body);
});

test("Cannot send empty message", async ({ api }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	await request(api.app)
		.post(`/channel/${guild.channels[0].mention}/messages`)
		.auth(user.token, { type: "bearer" })
		.send({
			content: "",
			files: [],
		})
		.expect(400);
});
