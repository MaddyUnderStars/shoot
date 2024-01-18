import crypto from "crypto";
import fs from "fs/promises";
import { promisify } from "util";
import { closeDatabase, config, initDatabase, registerUser } from "./util";
import { createLogger } from "./util/log";
import { KEY_OPTIONS } from "./util/rsa";
const generateKeyPair = promisify(crypto.generateKeyPair);

const Log = createLogger("cli");

const handleCli = async () => {
	const args = process.argv.slice(2);
	const cmd = args.shift()?.toLowerCase();

	if (!cmd) {
		Log.warn(
			`Syntax: \`npm run cli -- [option]. Options:\n` +
				`generate-keys - Generate signing keys for federation HTTP signatures and user tokens\n` +
				`add-user [username] [email?] - Register a new user`,
		);
		return;
	}

	const exec = handlers[cmd];
	if (!exec) {
		Log.error(`Unknown option ${cmd}`);
		return;
	}

	await exec(...args);
};

const handlers = {
	"generate-keys": async () => {
		Log.msg("Generating public/private keys");

		const keys = await generateKeyPair("rsa", KEY_OPTIONS);

		const filename = `./config/default.json`;
		let existing: any = { federation: {} };
		try {
			existing = (await fs.readFile(filename)).toString();
		} catch (e) {}

		existing = JSON.parse(JSON.stringify(existing));

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
					}
				},
				null,
				2,
			),
		);

		Log.msg(`Saved to ${filename}`);
	},

	"add-user": async (username: string, email?: string) => {
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

		const handle = `${username}@${config.federation.webapp_url.hostname}`;

		await initDatabase();
		try {
			await registerUser(username, password, email, true);
		} catch (e) {
			Log.error(
				`Could not register user ${handle},`,
				e instanceof Error ? e.message : e,
			);
			closeDatabase();
			return;
		}

		Log.msg(
			`Registered user '${handle}' with password '${password}'`,
		);
		await closeDatabase();
	},
} as { [key: string]: Function };

handleCli();
