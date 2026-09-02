import request from "supertest";
import { test } from "../../../../fixture.js";
import { describe } from "vitest";
import * as crypto from "node:crypto";

const REDIRECT = "shoot://login/";

test.beforeAll(async ({ api: _ }) => {
	const { registerUser } = await import("../../../../../src/util/entity/user.js");

	await registerUser("test", "test");
});

describe("Oauth", () => {
	let client_secret: string;
	let client_id: string;
	let code: string;
	let code_verifier: string;

	test("Can register oauth client", { concurrent: false }, async ({ api, expect }) => {
		const res = await request(api.app)
			.post("/oauth/register")
			.send({
				client_name: "vitest",
				redirect_uris: [REDIRECT],
				grant_types: ["authorization_code", "refresh_token"],
			})
			.expect(201);

		expect(res.body).toEqual({
			client_id: expect.any(String),
			client_secret: expect.any(String),
			client_secret_expires_at: 0,
			client_id_issued_at: expect.any(Number),
			grant_types: expect.arrayContaining(["authorization_code", "refresh_token"]),
			redirect_uris: expect.arrayContaining([REDIRECT]),
			client_name: "vitest",
		});

		client_secret = res.body.client_secret;
		client_id = res.body.client_id;
	});

	test("Can authorize", { concurrent: false }, async ({ api, expect }) => {
		code_verifier = crypto.randomBytes(32).toString("hex");
		const state = crypto.randomBytes(32).toString("hex");
		const code_challenge = crypto
			.createHash("sha256")
			.update(code_verifier)
			.digest("base64url");

		const res = await request(api.app)
			.post("/oauth/authorize")
			.send({
				code_challenge,
				client_id,
				state,
				redirect_uri: REDIRECT,
				response_type: "code",
				code_challenge_method: "S256",

				username: "test",
				password: "test",
			})
			.expect(302);

		const redirect = res.header.location;
		expect(redirect).toBeTruthy();

		const maybeCode = new URL(redirect).searchParams.get("code");
		expect(maybeCode).toBeTruthy();
		if (!maybeCode) throw new Error("code not given");

		code = maybeCode;
	});

	test("Rejects invalid credentials", { concurrent: false }, async ({ api }) => {
		const bad_code_verifier = crypto.randomBytes(32).toString("hex");
		const bad_state = crypto.randomBytes(32).toString("hex");
		const bad_code_challenge = crypto
			.createHash("sha256")
			.update(bad_code_verifier)
			.digest("base64url");

		await request(api.app)
			.post("/oauth/authorize")
			.send({
				code_challenge: bad_code_challenge,
				client_id,
				state: bad_state,
				redirect_uri: REDIRECT,
				response_type: "code",
				code_challenge_method: "S256",

				username: "test",
				password: "bad",
			})
			.expect(401);
	});

	test("Can exchange for tokens", { concurrent: false }, async ({ api, expect }) => {
		const res = await request(api.app)
			.post("/oauth/token")
			.set("Content-Type", "application/x-www-form-urlencoded")
			.send({
				client_secret,
				client_id,
				code,
				code_verifier,
				redirect_uri: REDIRECT,
				grant_type: "authorization_code",
			})
			.expect(200);

		expect(res.body).toEqual({
			access_token: expect.any(String),
			refresh_token: expect.any(String),
			expires_in: expect.any(Number),
			token_type: "Bearer",
			scope: "",
		});
	});
});
