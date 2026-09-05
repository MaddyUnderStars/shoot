import * as crypto from "node:crypto";
import { createLogger } from "../../util/log.js";
import { promisify } from "node:util";
import { ArgsConfigWithHelp, ParseArgsValues } from "./index.js";
const randomBytes = promisify(crypto.randomBytes);

const Log = createLogger("cli");

const generateOauthClientOptions: ArgsConfigWithHelp = {
	redirectUri: {
		type: "string",
		short: "r",
		multiple: true,
	},
	grant: {
		type: "string",
		short: "g",
		multiple: true,
		default: ["authorization_code", "refresh_code"],
	},
	name: {
		type: "string",
		short: "n",
		default: undefined,
	},
};

const generateOauthClientHandler = async (values: ParseArgsValues) => {
	const {
		redirectUri: redirectUris,
		grant: grants,
		name,
	} = values as {
		redirectUri: string[];
		grant: string[];
		name?: string;
	};

	if (!redirectUris) {
		throw new Error("Must specify at least one redirect uri");
	}

	const { initDatabase } = await import("../../util/database.js");

	await initDatabase();

	const { OauthClient } = await import("../../entity/oauthClient.js");

	const client = await OauthClient.create({
		name,
		redirectUris,
		grants,
		secret: (await randomBytes(32)).toString("hex"),
	}).save();

	Log.msg(`Oauth client created\nclient id: ${client.id}\nclient_secret: ${client.secret}`);
};

export const generateOauthClient = {
	description: "Generate an OAuth client",
	handler: generateOauthClientHandler,
	options: generateOauthClientOptions,
};
