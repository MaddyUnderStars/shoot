import { createLogger } from "../util/log";
import { cliHandlers } from "./handlers";

const Log = createLogger("cli");

export const handleCli = async (argv: string[]) => {
	const args = argv.slice(2);
	const cmd = args.shift()?.toLowerCase();

	if (!cmd) {
		Log.warn(
			"Syntax: `npm run cli -- [option]. Options:\n" +
				"generate-keys - Generate signing keys for federation HTTP signatures and user tokens\n" +
				"add-user [username] [email?] - Register a new user",
		);
		return;
	}

	const exec = cliHandlers[cmd];
	if (!exec) {
		Log.error(`Unknown option ${cmd}`);
		return;
	}

	try {
		await exec(...args);
	} catch (e) {
		Log.error(e instanceof Error ? e.message : e);
	}
};
