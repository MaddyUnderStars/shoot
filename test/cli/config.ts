import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import test from "ava";

test("CLI does not require config", async (t) => {
	process.env.NODE_CONFIG_DIR = `${process.cwd()}/test/helpers/config`;
	process.env.NODE_CONFIG = "{}";
	process.env.SUPPRESS_NO_CONFIG_WARNING = "1";
	global.console.warn = () => {};

	const { handleCli } = await import("../../src/cli/cli");

	await handleCli(["node", process.cwd()]);

	t.pass();
});
