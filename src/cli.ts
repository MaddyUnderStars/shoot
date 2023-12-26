import crypto from "crypto";
import fs from "fs/promises";
import { promisify } from "util";
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
				`generate-keys - Generate signing keys for federation HTTP signatures`,
		);
		return;
	}

	switch (cmd) {
		case "generate-keys":
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
					},
					null,
					2,
				),
			);

			Log.msg(`Saved to ${filename}`);
			break;
		default:
			Log.error(`Unknown option ${cmd}`);
	}
};

handleCli();
