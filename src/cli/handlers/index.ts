import { parseArgs, ParseArgsOptionDescriptor } from "node:util";
import { addUser } from "./addUser.js";
import { generateKeys } from "./generateKeys.js";
import { generateOauthClient } from "./generateOauthClient.js";
import { generateRegInvite } from "./generateRegInvite.js";
import { instance } from "./instance.js";
import { resolve } from "./resolve.js";

export type ParseArgsValues = ReturnType<typeof parseArgs>["values"];
export type ParseArgsPositionals = ReturnType<typeof parseArgs>["positionals"];
export type ArgsConfigWithHelp = {
	[key: string]: ParseArgsOptionDescriptor & { description?: string };
};

export const cliHandlers = {
	"generate-keys": generateKeys,
	"generate-reg-invite": generateRegInvite,
	"generate-oauth-client": generateOauthClient,
	"add-user": addUser,
	instance: instance,
	resolve: resolve,
} as {
	[key: string]: {
		positionals?: string[];
		description?: string;
		options: ArgsConfigWithHelp;
		handler: (
			values: ParseArgsValues,
			positionals: ParseArgsPositionals,
		) => Promise<Error | void> | Error | void;
	};
};
