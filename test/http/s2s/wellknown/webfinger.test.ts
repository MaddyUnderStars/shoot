import request from "supertest";
import { test } from "../../../fixture";
import { createTestGuild } from "../../../testUtils/guilds";
import { createTestUser } from "../../../testUtils/users";

test("Webfinger finds users", async ({ api, expect }) => {
	const user = await createTestUser(api);

	const res = await request(api.app)
		.get(`/.well-known/webfinger?resource=${user.user.mention}`)
		.expect(200);

	const standardised = JSON.parse(
		JSON.stringify(res.body).replaceAll(
			user.user.mention.split("@")[0],
			"[MENTION]",
		),
	);
	expect(standardised).toMatchSnapshot();
});

test("Webfinger finds guilds", async ({ api, expect }) => {
	const user = await createTestUser(api);
	const guild = await createTestGuild(user);

	const res = await request(api.app)
		.get(`/.well-known/webfinger?resource=${guild.mention}`)
		.expect(200);

	const standardised = JSON.parse(
		JSON.stringify(res.body).replaceAll(guild.id, "[MENTION]"),
	);
	expect(standardised).toMatchSnapshot();
});

test.todo("Webfinger finds channels");
test.todo("Webfinger finds guild invites");
