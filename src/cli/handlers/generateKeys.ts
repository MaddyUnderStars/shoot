import crypto from "node:crypto";
import { promisify } from "node:util";
import type { DeepPartial } from "typeorm";
import webPush from "web-push";
import type { ConfigSchema } from "../../util/ConfigSchema";
import { createLogger } from "../../util/log";
import { KEY_OPTIONS } from "../../util/rsa";
import { appendToConfig } from "../util";

const generateKeyPair = promisify(crypto.generateKeyPair);

const Log = createLogger("cli");

export const generateKeys = async () => {
	Log.msg("Generating public/private keys");

	const federationKeys = await generateKeyPair("rsa", KEY_OPTIONS);

	const webPushKeys = webPush.generateVAPIDKeys();

	await appendToConfig(
		{
			federation: {
				public_key: federationKeys.publicKey,
				private_key: federationKeys.privateKey,
			},
			security: {
				jwt_secret: crypto.randomBytes(256).toString("base64"),
			},
			notifications: {
				privateKey: webPushKeys.privateKey,
				publicKey: webPushKeys.publicKey,
			},
		} satisfies DeepPartial<ConfigSchema>,
		"./config/default.json",
	);

	Log.msg("Saved to ./config/default.json");
};
