import { createLogger } from "../../util/log";
import { KEY_OPTIONS } from "../../util/rsa";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { promisify } from "node:util";
const generateKeyPair = promisify(crypto.generateKeyPair);

const Log = createLogger("cli");

export const generateKeys = async () => {
	Log.msg("Generating public/private keys");

	const keys = await generateKeyPair("rsa", KEY_OPTIONS);

	const filename = "./config/default.json";
	let file: string | undefined = undefined;
	try {
		file = (await fs.readFile(filename)).toString();
	} catch (e) {}

	const config = file ? JSON.parse(JSON.stringify(file)) : { federation: {} };

	await fs.mkdir("./config", { recursive: true });
	await fs.writeFile(
		filename,
		JSON.stringify(
			{
				federation: {
					public_key: keys.publicKey,
					private_key: keys.privateKey,
				},
				security: {
					jwt_secret: crypto.randomBytes(256).toString("base64"),
				},
			},
			null,
			2,
		),
	);

	Log.msg(`Saved to ${filename}`);
};
