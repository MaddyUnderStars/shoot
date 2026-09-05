import { createLogger } from "../../util/log.js";
import { ArgsConfigWithHelp, ParseArgsPositionals, ParseArgsValues } from "./index.js";

const Log = createLogger("cli");

const generateRegInviteOptions: ArgsConfigWithHelp = {
	maxUses: {
		type: "string",
		short: "u",
		default: undefined,
	},
	expiry: {
		type: "string",
		short: "e",
		default: undefined,
	},
};

const generateRegInviteHandler = async (
	values: ParseArgsValues,
	positionals: ParseArgsPositionals,
) => {
	const { expiry, maxUses } = values as { expiry?: string; maxUses?: string };
	let [code] = positionals;

	const { initDatabase } = await import("../../util/database.js");

	await initDatabase();

	const { InstanceInvite } = await import("../../entity/instanceInvite.js");
	const { generateInviteCode } = await import("../../util/entity/invite.js");

	if (!code || code === "-1") {
		code = await generateInviteCode(
			async (x) => (await InstanceInvite.count({ where: { code: x } })) !== 0,
		);
	}

	await InstanceInvite.create({
		code,
		expires: !expiry ? null : new Date(expiry),
		maxUses: !maxUses ? null : Number.parseInt(maxUses, 10),
	}).save();

	Log.msg(`Saved invite with code ${code}`);
};

export const generateRegInvite = {
	positionals: ["code?"],
	description:
		"Generate an instance invite token that can be used while registration is disabled",
	options: generateRegInviteOptions,
	handler: generateRegInviteHandler,
};
