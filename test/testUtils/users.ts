import type { StartedTestContainer } from "testcontainers";
import type { PrivateUser } from "../../src/entity/user.js";
import { APIServer } from "../../src/http/server.js";
import { runCliInContainer } from "./cli.js";
import { getTestString } from "./random.js";
import { isApiServer } from "./isApiServer.js";
import * as crypto from "node:crypto";
import { testFetch } from "./testfetch.js";

export type TestUser = Awaited<ReturnType<typeof createTestUser>>;

export const createTestUser = async (target: APIServer | StartedTestContainer) => {
	const username = getTestString();
	let password: string;

	let body: { token: string; user: PrivateUser };

	if (isApiServer(target)) {
		const { registerUser } = await import("../../src/util/entity/user.js");
		password = getTestString();
		const user = await registerUser(username, password);
		const token = await createTestAccessToken(target, username, password);

		body = {
			user: user.toPrivate(),
			token,
		};
	} else {
		const res = await runCliInContainer(target, `add-user ${username}`);

		const extract = res.stdout.match(/with password '(.*?)'/)?.[1];
		if (!extract) throw new Error("could not find password in cli output");

		password = extract;

		const token = await createTestAccessToken(target, username, password);

		const userRes = await testFetch(target, "/user/@me");
		const user = "json" in userRes ? await userRes.json() : userRes.body;

		body = {
			user,
			token,
		};
	}

	return {
		username,
		password,
		...body,
	};
};

export const createTestAccessToken = async (
	target: APIServer | StartedTestContainer,
	username: string,
	password: string,
) => {
	const REDIRECT = "shoot://login/";
	const code_verifier = crypto.randomBytes(32).toString("hex");
	const state = crypto.randomBytes(32).toString("hex");
	const code_challenge = crypto.createHash("sha256").update(code_verifier).digest("base64url");

	let res = await testFetch(target, "/oauth/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_name: "vitest",
			redirect_uris: [REDIRECT],
			grant_types: ["authorization_code"],
		}),
	});
	const { client_id, client_secret } = "json" in res ? await res.json() : res.body;

	res = await testFetch(target, "/oauth/authorize", {
		method: "POST",
		redirect: "manual",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			code_challenge,
			client_id,
			state,
			redirect_uri: REDIRECT,
			response_type: "code",
			code_challenge_method: "S256",

			username,
			password,
		}),
	});
	const header =
		res.headers instanceof Headers ? res.headers.get("location") : res.headers.location;
	if (!header)
		throw new Error(
			`could not get location header: ${"json" in res ? await res.text() : res.body}`,
		);
	const url = new URL(header);
	const code = url.searchParams.get("code");
	if (state !== url.searchParams.get("state")) throw new Error("state did not match");
	if (!code) throw new Error("failed to get auth code");

	res = await testFetch(target, "/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: JSON.stringify({
			redirect_uri: REDIRECT,
			code,
			code_verifier,
			grant_type: "authorization_code",
			client_id,
			client_secret,
		}),
	});
	if (!res.ok) {
		throw new Error("json" in res ? await res.text() : res.body);
	}
	const { access_token } = "json" in res ? await res.json() : res.body;

	return access_token;
};
