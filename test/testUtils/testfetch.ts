import { StartedTestContainer } from "testcontainers";
import { APIServer } from "../../src/http/server.js";
import { isApiServer } from "./isApiServer.js";
import request from "supertest";
import { getShootContainerUrl } from "./container.js";
import { AllMethods } from "supertest/types.js";

export const testFetch = async (
	target: APIServer | StartedTestContainer,
	path: string,
	init?: RequestInit,
) => {
	if (isApiServer(target)) {
		let req = request(target.app)[(init?.method?.toLowerCase() ?? "get") as AllMethods](path);

		if (init?.headers && "Content-Type" in init.headers) {
			req.set("Content-Type", init.headers["Content-Type"] as string);
		}

		return req.send(
			//@ts-expect-error
			JSON.parse(init?.body),
		);
	} else {
		return fetch(new URL(path, getShootContainerUrl(target)), init);
	}
};
