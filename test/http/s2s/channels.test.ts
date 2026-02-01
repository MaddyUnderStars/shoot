import { test } from "../../fixture";
import {
	getShootContainerUrl,
	startShootContainer,
	waitForLogMessage,
} from "../../testUtils/container";
import { createTestUser } from "../../testUtils/users";

test(
	"Send message to foreign user",
	{ timeout: 20_000 },
	async ({ onTestFinished, expect }) => {
		const [local, remote] = await Promise.all([
			startShootContainer(),
			startShootContainer(),
		]);

		onTestFinished(async () => {
			await Promise.all([local.stop(), remote.stop()]);
		});

		const [localUser, remoteUser] = await Promise.all([
			createTestUser(local),
			createTestUser(remote),
		]);

		// create DM between them

		const localLogs = waitForLogMessage(
			local,
			"[AP:DISTRIBUTE] Sent activity",
		);

		const dmRes = await fetch(
			new URL(
				`/users/${remoteUser.user.mention}/channels`,
				getShootContainerUrl(local),
			),
			{
				method: "POST",
				headers: {
					Authorization: localUser.token,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: "test dm",
				}),
			},
		);

		expect(dmRes.status).toBe(200);

		const dm = await dmRes.json();

		await localLogs;

		const remoteLogs = waitForLogMessage(
			remote,
			'query: INSERT INTO "messages"',
		);
		const sendRes = await fetch(
			new URL(
				`/channel/${dm.mention}/messages`,
				getShootContainerUrl(local),
			),
			{
				method: "POST",
				headers: {
					Authorization: localUser.token,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					content: "hello",
				}),
			},
		);

		expect(sendRes.status).toBe(200);

		await remoteLogs;

		const getRes = await fetch(
			new URL(
				`/channel/${dm.mention}/messages`,
				getShootContainerUrl(remote),
			),
			{
				method: "GET",
				headers: {
					Authorization: remoteUser.token,
				},
			},
		);

		expect(getRes.status).toBe(200);

		const get = await getRes.json();

		const message = get[0];
		expect(message.content).toBe("hello");
	},
);
