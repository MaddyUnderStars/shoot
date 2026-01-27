import request from "supertest";
import type { PrivateUser } from "../../src/entity/user";
import type { APIServer } from "../../src/http/server";
import { getTestString } from "./random";

export const createTestUser = async (api: APIServer) => {
	const { registerUser } = await import("../../src/util/entity/user");

	const username = `${getTestString()}`;
	const password = `${getTestString()}`;

	await registerUser(username, password);

	const res = await request(api.app)
		.post("/auth/login")
		.send({
			username,
			password,
		})
		.expect(200);

	return {
		username,
		password,
		...(res.body as { token: string; user: PrivateUser }),
	};
};
