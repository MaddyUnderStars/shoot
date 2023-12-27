import bcrypt from "bcrypt";
import crypto from "crypto";
import { promisify } from "util";
const generateKeyPair = promisify(crypto.generateKeyPair);

import { User } from "../../entity";
import { config } from "../config";

import {
    APError,
    ActorMention,
    createUserForRemotePerson,
    splitQualifiedMention,
} from "../activitypub";
import { createLogger } from "../log";
import { KEY_OPTIONS } from "../rsa";

const Log = createLogger("users");

export const registerUser = async (
	username: string,
	password: string,
	email?: string,
) => {
	const user = await User.create({
		name: username,
		email,
		password_hash: await bcrypt.hash(password, 12),
		public_key: "", // TODO: bad solution

		display_name: username,
		valid_tokens_since: new Date(),
		domain: config.federation.webapp_url.hostname,
	}).save();

	setImmediate(async () => {
		const start = Date.now();
		const keys = await generateKeyPair("rsa", KEY_OPTIONS);

		await User.update(
			{ id: user.id },
			{ public_key: keys.publicKey, private_key: keys.privateKey },
		);

		Log.verbose(
			`Generated keys for user '${user.name} in ${
				Date.now() - start
			}ms`,
		);
	});

	Log.verbose(`User '${user.name}' registered`);
	return user;
};

export const getOrFetchUser = async (user_id: string) => {
	const mention = splitQualifiedMention(user_id);

	let user = await User.findOne({
		where: {
			name: mention.user,
			domain: mention.domain,
		},
	});

	if (!user && config.federation.enabled) {
		// Fetch from remote instance
		user = await createUserForRemotePerson(user_id);
		await user.save();
	} else if (!user) {
		throw new APError("User could not be found", 404);
	}

	return user;
};

export const batchGetUsers = async (users: ActorMention[]) => {
	return Promise.all(users.map((user) => getOrFetchUser(user)));
};
