import { test } from "../../fixture.js";
import { startShootContainer, waitForLogMessage } from "../../testUtils/container.js";
import { createTestGuild } from "../../testUtils/guilds.js";
import { createTestUser, TestUser } from "../../testUtils/users.js";
import { containerFetch } from "../../testUtils/containerFetch.js";
import type { PublicInvite } from "../../../src/entity/invite.js";
import type { PublicGuild } from "../../../src/entity/guild.js";
import { Client as PgClient } from "pg";
import { describe, inject } from "vitest";
import { StartedTestContainer } from "testcontainers";
import type { PublicMessage } from "../../../src/entity/message.js";

describe("Guilds", { concurrent: false }, () => {
	let local: StartedTestContainer;
	let localDatabaseName: string;
	let remote: StartedTestContainer;

	let localUser: TestUser;
	let remoteUser: TestUser;

	let guild: PublicGuild;

	test.beforeAll(async () => {
		const containers = await Promise.all([
			startShootContainer("local"),
			startShootContainer("remote"),
		]);

		local = containers[0].shoot;
		localDatabaseName = containers[0].databaseName;
		remote = containers[1].shoot;

		const users = await Promise.all([createTestUser(local), createTestUser(remote)]);

		localUser = users[0];
		remoteUser = users[1];

		let guildKeyLogs = waitForLogMessage(local, "[RSA] Generated keys for actor Guild[");
		let channelKeyLogs = waitForLogMessage(
			local,
			"[RSA] Generated keys for actor GuildTextChannel[",
		);

		guild = await createTestGuild(localUser, local);

		await Promise.allSettled([guildKeyLogs, channelKeyLogs]);
	}, 20_000);

	test.afterAll(async () => {
		await Promise.all([local.stop(), remote.stop()]);
	});

	test("Join remote guild via invite", async ({ expect }) => {
		const inviteRes = await containerFetch(`/guild/${guild.mention}/invite`, local, localUser, {
			method: "POST",
		});
		const inviteJson = (await inviteRes.json()) as PublicInvite;

		const joinRes = await containerFetch(
			`/invite/${inviteJson.code}@${local.getHostname()}`,
			remote,
			remoteUser,
			{ method: "POST" },
		);

		await joinRes.text();
		expect(joinRes.ok).toBeTruthy();

		const guildsRes = await containerFetch("/users/@me/guild", remote, remoteUser);
		const guildsJson = (await guildsRes.json()) as PublicGuild[];

		expect(guildsJson.length).toBe(1);

		// there's no route for fetching guild members currently
		// so have to check it ourselves

		const postgres = inject("POSTGRES_AUTH");
		const dbClient = new PgClient({
			...postgres,
			database: localDatabaseName,
		});
		await dbClient.connect();
		const localMemberRes = await dbClient.query(
			`select count(*) from roles_members_guild_members`,
		);
		expect(localMemberRes.rows[0]["count"]).toBe("2");
	});

	test("Send message to federated guild channel", async ({ expect }) => {
		const localLogs = waitForLogMessage(local, 'query: INSERT INTO "messages"');

		const sendRes = await containerFetch(
			`/channel/${guild.channels![0].mention}/messages`,
			remote,
			remoteUser,
			{
				method: "POST",
				body: JSON.stringify({
					content: "federated message",
				}),
			},
		);

		const sendJson = (await sendRes.json()) as PublicMessage;

		expect(sendJson.content).toBe("federated message");

		await localLogs;

		const getRes = await containerFetch(
			`/channel/${guild.channels![0].mention}/messages`,
			local,
			localUser,
		);

		const getJson = (await getRes.json()) as { messages: PublicMessage[] };

		expect(getJson.messages.length).toBe(1);
	});
});
