import type { StartedTestContainer } from "testcontainers";
import type { PrivateUser } from "../../src/entity/user.js";
import { APIServer } from "../../src/http/server.js";
import { runCliInContainer } from "./cli.js";
import { getShootContainerUrl } from "./container.js";
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

		const login = await fetch(new URL("/auth/login", getShootContainerUrl(target)), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username,
				password,
			}),
		});

		body = (await login.json()) as typeof body;

		if (!body.token || !body.user) throw new Error("token or user not provided by container");
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
	const code_verifier = crypto.randomBytes(32).toString("hex");
	const state = crypto.randomBytes(32).toString("hex");
	const code_challenge = crypto.createHash("sha256").update(code_verifier).digest("base64url");

	let res = await testFetch(target, "/oauth/register", {
		method: "POST",
		body: JSON.stringify({
			client_name: "vitest",
			redirect_uris: ["urn:ietf:wg:oauth:2.0:oob"],
			grant_types: ["authorization_code", "refresh_token"],
		}),
	});
	const { client_id, client_secret } = "json" in res ? await res.json() : res.body;

	res = await testFetch(target, "/oauth/authorize", {
		method: "POST",
		body: JSON.stringify({
			code_challenge,
			client_id,
			state,
			redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
			response_type: "code",
			code_challenge_method: "S256",

			username,
			password,
		}),
	});
	const header =
		res.headers instanceof Headers ? res.headers.get("location") : res.headers.location;
	if (!header) throw new Error("could not get location header");
	const url = new URL(header);
	const code = url.searchParams.get("code");
	if (!code) throw new Error("failed to get auth code");

	res = await testFetch(target, "/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: JSON.stringify({
			grant_type: "authorization_code",
			client_id,
			redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
			code,
			code_verifier,
			client_secret,
		}),
	});
	const { access_token } = "json" in res ? await res.json() : res.body;

	return access_token;
};
