import type { StartedTestContainer } from "testcontainers";

export const runCliInContainer = async (
	container: StartedTestContainer,
	command: string | string[],
) => {
	const split = Array.isArray(command) ? command : command.split(" ");

	const res = await container.exec([
		"/nodejs/bin/node",
		"/app/dist/cli/index.js",
		...split,
	]);

	if (res.exitCode !== 0) throw new Error(res.stderr);

	return res;
};
