import type { StartedTestContainer } from "testcontainers";
import type { APIServer } from "../../src/http/server.js";

export const isApiServer = (target: APIServer | StartedTestContainer): target is APIServer =>
	"app" in target;
