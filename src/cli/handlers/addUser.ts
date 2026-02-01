import crypto from "node:crypto";
import { createLogger } from "../../util/log";

const Log = createLogger("cli");

export const addUser = async (username: string, email?: string) => {
	const generatePassword = (
		length = 20,
		characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$",
	) =>
		Array.from(crypto.randomFillSync(new Uint32Array(length)))
			.map((x) => characters[x % characters.length])
			.join("");

	const password = generatePassword();

	if (!username) {
		Log.error("Must specify username");
		return;
	}

	const { config } = await import("../../util/config");
	const { initDatabase, closeDatabase } = await import("../../util/database");
	const { registerUser } = await import("../../util/entity/user");

	const handle = `${username}@${config().federation.webapp_url.hostname}`;

	await initDatabase();
	try {
		await registerUser(username, password, email, true);
	} catch (e) {
		Log.error(
			`Could not register user ${handle},`,
			e instanceof Error ? e.message : e,
		);
		return;
	}

	Log.msg(`Registered user '${handle}' with password '${password}'`);

	closeDatabase();
};
