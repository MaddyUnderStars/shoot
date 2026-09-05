import crypto from "node:crypto";
import { createLogger } from "../../util/log.js";
import { ArgsConfigWithHelp, ParseArgsValues } from "./index.js";

const Log = createLogger("cli");

const generatePassword = (
	length = 20,
	characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$",
) =>
	Array.from(crypto.randomFillSync(new Uint32Array(length)))
		.map((x) => characters[x % characters.length])
		.join("");

const addUserOptions: ArgsConfigWithHelp = {
	username: {
		type: "string",
		short: "u",
	},
	email: {
		type: "string",
		short: "e",
		default: undefined,
	},
};

const addUserHandler = async (values: ParseArgsValues) => {
	const { username, email } = values as { username: string; email: string | undefined };

	const password = generatePassword();

	if (!username) {
		Log.error("Must specify username");
		return;
	}

	const { config } = await import("../../util/config.js");
	const { initDatabase } = await import("../../util/database.js");
	const { registerUser } = await import("../../util/entity/user.js");

	const handle = `${username}@${config().federation.webapp_url.hostname}`;

	await initDatabase();
	try {
		await registerUser(username, password, email, true);
	} catch (e) {
		Log.error(`Could not register user ${handle},`, e instanceof Error ? e.message : e);
		return;
	}

	Log.msg(`Registered user '${handle}' with password '${password}'`);
};

export const addUser = {
	description: "Register a new user with a random password",
	handler: addUserHandler,
	options: addUserOptions,
};
