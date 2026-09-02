import { StartedTestContainer } from "testcontainers";
import { APIServer } from "../../src/http/server.js";
import { isApiServer } from "./isApiServer.js";
import request from "supertest";
import { getShootContainerUrl } from "./container.js";
import { AllMethods } from "supertest/types.js";

export const testFetch = async (
	target: APIServer | StartedTestContainer,
	path: string,
	init?: Omit<RequestInit, "body"> & { body?: any },
) => {
	if (isApiServer(target)) {
		let req = request(target.app)[(init?.method?.toLowerCase() ?? "get") as AllMethods](path);

		if (init?.headers && "Content-Type" in init.headers) {
			req.set("Content-Type", init.headers["Content-Type"] as string);
		}

		if (init?.headers && "Authorization" in init.headers) {
			req.auth(init.headers["Authorization"] as string, { type: "bearer" });
		}

		return req.send(init?.body);
	} else {
		if (
			init?.headers &&
			"Content-Type" in init.headers &&
			init?.headers["Content-Type"] == "application/x-www-form-urlencoded" &&
			init?.body
		) {
			init.body = new URLSearchParams(init.body);
		}

		return fetch(new URL(path, getShootContainerUrl(target)), init);
	}
};
