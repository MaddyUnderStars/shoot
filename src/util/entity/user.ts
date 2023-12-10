import bcrypt from "bcrypt";

import { User } from "../../entity";
import { config } from "../config";

import { createLogger } from "../log";

const Log = createLogger("users");

export const registerUser = async (
	username: string,
	password: string,
	email?: string,
) => {
	const user = await User.create({
		username,
		email,
		password_hash: await bcrypt.hash(password, 12),

		display_name: username,
		valid_tokens_since: new Date(),
		domain: config.federation.webapp_url.hostname,
	}).save();

	Log.verbose(`User '${user.username}' registered`);
	return user;
};
