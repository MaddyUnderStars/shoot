import { Guild, User } from "../../entity";
import { config } from "../config";
import { emitGatewayEvent } from "../events";
import { generateSigningKeys } from "./actor";
import { createGuildTextChannel } from "./channel";

export const createGuild = async (name: string, owner: User) => {
	const guild = await Guild.create({
		name,
		owner,

		domain: config.federation.webapp_url.hostname,
	}).save();

	setImmediate(() => generateSigningKeys(guild));

	emitGatewayEvent([owner.id], {
		type: "GUILD_CREATE",
		guild: guild.toPublic(),
	});

	// create channels

	await createGuildTextChannel("general", guild);

	return guild;
};
