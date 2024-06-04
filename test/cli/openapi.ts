import test from "ava";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

test("Can generate openapi schema", (t) =>
	new Promise((resolve, reject) => {
		const child = spawn("npm", ["run", "openapi"]);
		child.on("close", (code) => {
			t.is(code, 0);
			t.assert(
				fs.existsSync(
					path.join(
						__dirname,
						"..",
						"..",
						"..",
						"assets",
						"client.json",
					),
				),
			);
			resolve();
		});
	}));
