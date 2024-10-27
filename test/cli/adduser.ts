import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

test("Can create user", async (t) => {
	const { handleCli } = await import("../../src/cli/cli");
	const { User } = await import("../../src/entity/user");

	await handleCli([
		"node",
		process.cwd(),
		"add-user",
		"testuser",
		"test@localhost",
	]);

	const user = await User.findOneOrFail({
		where: { name: "testuser", email: "test@localhost" },
	});
	t.assert(user.private_key);
	t.assert(user.public_key);
	t.assert(user.password_hash);
});
