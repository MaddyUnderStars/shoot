import { createLogger } from "../../util/log";
import { KEY_OPTIONS } from "../../util/rsa";

import crypto from "node:crypto";
import { promisify } from "node:util";
import { appendToConfig } from "../util";
const generateKeyPair = promisify(crypto.generateKeyPair);

const Log = createLogger("cli");

export const generateKeys = async () => {
	Log.msg("Generating public/private keys");

	const keys = await generateKeyPair("rsa", KEY_OPTIONS);

	await appendToConfig(
		{
			federation: {
				public_key: keys.publicKey,
				private_key: keys.privateKey,
			},
			security: {
				jwt_secret: crypto.randomBytes(256).toString("base64"),
			},
		},
		"./config/default.json",
	);

	Log.msg("Saved to ./config/default.json");
};
