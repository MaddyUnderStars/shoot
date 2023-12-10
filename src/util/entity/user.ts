import bcrypt from "bcrypt";
import crypto from "crypto";
import { promisify } from "util";
const generateKeyPair = promisify(crypto.generateKeyPair);

import { User } from "../../entity";
import { config } from "../config";

import { createLogger } from "../log";

const Log = createLogger("users");

export const registerUser = async (
	username: string,
	password: string,
	email?: string,
) => {
	const keys = await generateKeyPair("rsa", {
		modulusLength: 4096,
		publicKeyEncoding: {
			type: "spki",
			format: "pem",
		},
		privateKeyEncoding: {
			type: "pkcs8",
			format: "pem",
		},
	});

	const user = await User.create({
		username,
		email,
		password_hash: await bcrypt.hash(password, 12),
		private_key: keys.privateKey,
		public_key: keys.publicKey,
		
		display_name: username,
		valid_tokens_since: new Date(),
		domain: config.federation.webapp_url.hostname,
	}).save();

	Log.verbose(`User '${user.username}' registered`);
	return user;
};
