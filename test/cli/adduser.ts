import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import test from "ava";
import { setupTests } from "../helpers/env";
setupTests(test);

test("Can create user", async (t) => {
	const { handleCli } = await import("../../src/cli/cli");
	const { User } = await import("../../src/entity/user");
	const databaseUtils = await import("../../src/util/database");
	const closeDatabase = databaseUtils.closeDatabase;

	Object.assign(databaseUtils, { closeDatabase: () => {} });

	process.env.NODE_ENV = "not-test";

	await handleCli([
		"node",
		process.cwd(),
		"add-user",
		"testuser",
		"test@localhost",
	]);

	process.env.NODE_ENV = "test";

	Object.assign(databaseUtils, { closeDatabase });

	const user = await User.findOneOrFail({
		where: { name: "testuser", email: "test@localhost" },
	});
	t.assert(user.private_key);
	t.assert(user.public_key);
	t.assert(user.password_hash);
});
