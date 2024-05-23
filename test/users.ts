import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "./helpers";
setupTests(test);

test("Register", async (t) => {
	const { registerUser } = await import("../src/util/entity/user");
	await registerUser("testuser", "hello", undefined, true);
	t.pass();
});
