import type { StartedTestContainer } from "testcontainers";
import type { APIServer } from "../../src/http/server";

export const isApiServer = (target: APIServer | StartedTestContainer): target is APIServer =>
	"app" in target;
