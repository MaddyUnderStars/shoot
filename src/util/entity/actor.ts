import type { Actor } from "../../entity";
import { createLogger } from "../log";
import { KEY_OPTIONS } from "../rsa";

import crypto from "node:crypto";
import { promisify } from "node:util";
const generateKeyPair = promisify(crypto.generateKeyPair);

const Log = createLogger("RSA");

export const generateSigningKeys = async (actor: Actor) => {
	const start = Date.now();
	const keys = await generateKeyPair("rsa", KEY_OPTIONS);

	actor.assign({ public_key: keys.publicKey, private_key: keys.privateKey });
	await actor.save();

	Log.verbose(
		`Generated keys for actor ${actor.id} in ${Date.now() - start}ms`,
	);

	return actor;
};
