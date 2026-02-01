import request from "supertest";
import { PERMISSION } from "../../../../../src/util/permission";
import { test } from "../../../../fixture";
import { createTestGuild } from "../../../../testUtils/guilds";
import { createTestUser, type TestUser } from "../../../../testUtils/users";

test.for([
	[PERMISSION.OWNER, true],
	[PERMISSION.ADMIN, true],
	[PERMISSION.MANAGE_GUILD, true],
	[PERMISSION.NONE, false],
])("Can edit guild as $permission ", async (opts, { api, dbClient }) => {
	const permission = opts[0] as PERMISSION;
	const allowed = opts[1] as boolean;

	const owner = await createTestUser(api);

	const guild = await createTestGuild(owner);

	let user: TestUser;

	if (permission === PERMISSION.OWNER) user = owner;
	else {
		// have to create a new user and add them here
		user = await createTestUser(api);

		const { joinGuild } = await import(
			"../../../../../src/util/entity/guild"
		);
		await joinGuild(user.user.mention, guild.mention);

		// TODO: there's no route to give this user the role yet
		// so just give the permission to @everyone
		await dbClient.query(
			"UPDATE roles SET allow = ARRAY[$1]::roles_allow_enum[] WHERE id = $2",
			[permission, guild.id],
		);
	}

	await request(api.app)
		.patch(`/guild/${guild.mention}`)
		.auth(user.token, { type: "bearer" })
		.send({
			name: "test name",
		})
		.expect(allowed ? 204 : 400);
});
