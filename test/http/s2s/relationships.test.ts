import { test } from "../../fixture";
import {
	getShootContainerUrl,
	startShootContainer,
	waitForLogMessage,
} from "../../testUtils/container";
import { createTestUser } from "../../testUtils/users";

test(
	"Send friend request to foreign user",
	{ timeout: 20_000 },
	async ({ onTestFinished, expect }) => {
		const [{ shoot: local }, { shoot: remote }] = await Promise.all([
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

		const remoteLogs = waitForLogMessage(remote, 'query: INSERT INTO "relationships"');

		const createRes = await fetch(
			new URL(`/users/${remoteUser.user.mention}/relationship`, getShootContainerUrl(local)),
			{
				method: "POST",
				headers: {
					Authorization: localUser.token,
					"Content-Type": "application/json",
				},
			},
		);

		expect(createRes.status).toBe(200);

		await remoteLogs;

		const localLogs = waitForLogMessage(local, 'query: UPDATE "relationships"');

		const acceptRes = await fetch(
			new URL(`/users/${localUser.user.mention}/relationship`, getShootContainerUrl(remote)),
			{
				method: "POST",
				headers: {
					Authorization: remoteUser.token,
					"Content-Type": "application/json",
				},
			},
		);

		expect(acceptRes.status).toBe(200);

		await localLogs;

		const getRemoteRes = await fetch(
			new URL(`/users/${localUser.user.mention}/relationship`, getShootContainerUrl(remote)),
			{
				method: "GET",
				headers: {
					Authorization: remoteUser.token,
					"Content-Type": "application/json",
				},
			},
		);

		expect(getRemoteRes.status).toBe(200);

		const getRemoteJson = await getRemoteRes.json();

		// RelationshipType.accept
		expect(getRemoteJson.type).toBe(1);

		const getLocalRes = await fetch(
			new URL(`/users/${remoteUser.user.mention}/relationship`, getShootContainerUrl(local)),
			{
				method: "GET",
				headers: {
					Authorization: localUser.token,
					"Content-Type": "application/json",
				},
			},
		);

		expect(getLocalRes.status).toBe(200);

		const getLocalJson = await getLocalRes.json();

		// RelationshipType.accept
		expect(getLocalJson.type).toBe(1);
	},
);
