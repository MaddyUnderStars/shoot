import { StartedTestContainer } from "testcontainers";
import { getShootContainerUrl } from "./container";
import { TestUser } from "./users";

export const containerFetch = async (
	path: string,
	target: StartedTestContainer,
	user: TestUser,
	init?: RequestInit,
) => {
	const url = new URL(path, getShootContainerUrl(target));

	return fetch(url, {
		...init,
		headers: {
			Authorization: user.token,
			"Content-Type": "application/json",
			// oxlint-disable-next-line typescript/no-misused-spread
			...init?.headers,
		},
	});
};
