import test from "ava";
import { spawn } from "child_process";
import fs from "fs";

test("Can generate openapi schema", (t) =>
	new Promise((resolve, reject) => {
		const child = spawn("npm", ["run", "openapi"]);
		child.on("close", (code) => {
			t.is(code, 0);
			t.assert(fs.existsSync("./assets/client.json"));
			resolve();
		});
	}));
