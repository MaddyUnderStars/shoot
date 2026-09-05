import { cliHandlers } from "./handlers/index.js";
import { parseArgs } from "node:util";

export const handleCli = async (argv: string[]) => {
	const args = argv.slice(2);
	const cmdName = args.shift()?.toLowerCase();

	if (!cmdName) {
		console.log(buildHelp());
		return;
	}

	const cmd = cliHandlers[cmdName];
	if (!cmd) {
		console.error("Command does not exist");
		return;
	}
	const { options, handler } = cmd;

	const { values, positionals } = parseArgs({ args, options, allowPositionals: true });

	try {
		await handler(values, positionals);
	} catch (e) {
		console.error(e);
	} finally {
		const { closeDatabase } = await import("../util/database.js");
		closeDatabase();
	}
};

const buildHelp = () => {
	let out = "";

	for (const cmd in cliHandlers) {
		const { options, description: cmdDesc, positionals } = cliHandlers[cmd];

		out += cmd;

		if (positionals) out += " " + positionals.map((x) => `[${x}]`).join(" ");
		if (cmdDesc) out += `\n\t${cmdDesc}\n`;

		for (const long in options) {
			const { default: defaultValue, short, description: optDesc } = options[long];

			out += `\n\t-${short}, --${long}`;

			if (defaultValue) {
				const def = Array.isArray(defaultValue)
					? defaultValue.join(`, --${long}=`)
					: `${defaultValue}`;
				out += `=${def}`;
			}

			if ("default" in options[long]) out += "\n\t\tOptional";
			if (optDesc) out += `\n\t\t${optDesc}`;

			out += "\n";
		}

		out += "\n";
	}

	return out;
};
