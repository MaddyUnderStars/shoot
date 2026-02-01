import request from "supertest";
import type { StartedTestContainer } from "testcontainers";
import type { PrivateUser } from "../../src/entity/user";
import type { APIServer } from "../../src/http/server";
import { runCliInContainer } from "./cli";
import { getShootContainerUrl } from "./container";
import { getTestString } from "./random";

const isApiServer = (
	target: APIServer | StartedTestContainer,
): target is APIServer => "app" in target;

export type TestUser = Awaited<ReturnType<typeof createTestUser>>;

export const createTestUser = async (
	target: APIServer | StartedTestContainer,
) => {
	const username = `${getTestString()}`;
	let password: string;

	let body: { token: string; user: PrivateUser };

	if (isApiServer(target)) {
		const { registerUser } = await import("../../src/util/entity/user");
		password = `${getTestString()}`;
		await registerUser(username, password);

		body = (
			await request(target.app)
				.post("/auth/login")
				.send({
					username,
					password,
				})
				.expect(200)
		).body;
	} else {
		const res = await runCliInContainer(target, `add-user ${username}`);

		const extract = res.stdout.match(/with password '(.*?)'/)?.[1];
		if (!extract) throw new Error("could not find password in cli output");

		password = extract;

		const login = await fetch(
			new URL("/auth/login", getShootContainerUrl(target)),
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username,
					password,
				}),
			},
		);

		body = await login.json();

		if (!body.token || !body.user)
			throw new Error("token or user not provided by container");
	}

	return {
		username,
		password,
		...body,
	};
};
