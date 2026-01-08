import { handleCli } from "../../src/cli/cli";
import { test } from "../fixture";

test("Does not require config", async ({ expect }) => {
	process.env.NODE_CONFIG = "";
	process.env.NODE_CONFIG_DIR = "";
	process.env.SUPPRESS_NO_CONFIG_WARNING = "1";

	expect(await handleCli(["node", process.cwd()])).not.toBeInstanceOf(Error);
});
