import * as crypto from "node:crypto";
import { createLogger } from "../../util/log.js";
import { promisify } from "node:util";
const randomBytes = promisify(crypto.randomBytes);

const Log = createLogger("cli");

export const generateOauthClient = async (redirectUris: string, grants: string, name?: string) => {
	const { initDatabase, closeDatabase } = await import("../../util/database.js");

	await initDatabase();

	const { OauthClient } = await import("../../entity/oauthClient.js");

	const client = await OauthClient.create({
		name,
		redirectUris: redirectUris.split(","),
		grants: grants.split(","),
		secret: (await randomBytes(32)).toString("hex"),
	}).save();

	Log.msg(`Oauth client created\nclient id: ${client.id}\nclient_secret: ${client.secret}`);

	closeDatabase();
};
