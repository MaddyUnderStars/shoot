import { Like } from "typeorm";
import { InstanceBehaviour } from "../../util/activitypub/instanceBehaviour.js";
import { createLogger } from "../../util/log.js";
import { appendToConfig } from "../util.js";
import { ParseArgsPositionals, ParseArgsValues } from "./index.js";

const Log = createLogger("cli");

const instanceOptions = {};

const instanceHandler = async (
	_values: ParseArgsValues,
	positionals: ParseArgsPositionals,
): Promise<void | Error> => {
	const [action, url] = positionals;

	if (!url) return new Error("Must specify URL");

	const { config } = await import("../../util/config.js");

	const parsed = new URL(
		!url.startsWith("http://") && !url.startsWith("https://") ? `https://${url}` : url,
	);

	const { User } = await import("../../entity/user.js");
	const { Guild } = await import("../../entity/guild.js");
	const { DMChannel } = await import("../../entity/DMChannel.js");
	const { GuildTextChannel } = await import("../../entity/textChannel.js");
	const { Channel } = await import("../../entity/channel.js");
	const { ApCache } = await import("../../entity/apcache.js");

	const { initDatabase } = await import("../../util/database.js");

	await initDatabase();

	if (!action || action == "view") {
		const [users, dm, text, guilds] = await Promise.all([
			User.count({ where: { domain: parsed.hostname } }),
			DMChannel.count({ where: { domain: parsed.hostname } }),
			GuildTextChannel.count({ where: { domain: parsed.hostname } }),
			Guild.count({ where: { domain: parsed.hostname } }),
		]);

		Log.msg(
			`\n\n'${parsed.hostname}' content in our local database:\n` +
				`Users: ${users}\n` +
				`Channels: ${dm + text} (dm: ${dm}, guild: ${text})\n` +
				`Guilds: ${guilds}`,
		);

		return;
	}

	if (config().federation.webapp_url.hostname === parsed.hostname) {
		Log.error("You can't block yourself");
		return;
	}

	switch (action.toLowerCase()) {
		case "block": {
			// delete all local content from that instance
			// add it to the instance blocklist
			Log.msg(`Deleting all content from ${url}`);

			await Promise.all([
				User.delete({ domain: parsed.hostname }),
				Guild.delete({ domain: parsed.hostname }),
				Channel.delete({ domain: parsed.hostname }),
				ApCache.delete({ id: Like(`${parsed.origin}%`) }),
			]);

			await appendToConfig({
				federation: {
					instances: {
						[parsed.hostname]: InstanceBehaviour.BLOCK,
					},
				},
			});

			Log.msg("Instance blocked and content deleted");

			break;
		}
		default:
			Log.error(`Action ${action} not implemented`);
			return;
	}
};

export const instance = {
	positionals: ["view, block", "instance url"],
	description: "View or manage a connection to a remote instance",
	handler: instanceHandler,
	options: instanceOptions,
};
