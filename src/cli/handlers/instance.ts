import { Like } from "typeorm";
import { InstanceBehaviour } from "../../util/activitypub/instanceBehaviour";
import { createLogger } from "../../util/log";
import { appendToConfig } from "../util";

const Log = createLogger("cli");

export const instance = async (url: string, action: string) => {
	if (!url) return Log.error("Must specify url");

	const { config } = await import("../../util/config");

	const parsed = new URL(
		!url.startsWith("http://") && !url.startsWith("https://")
			? `https://${url}`
			: url,
	);

	const { User } = await import("../../entity/user");
	const { Guild } = await import("../../entity/guild");
	const { DMChannel } = await import("../../entity/DMChannel");
	const { GuildTextChannel } = await import("../../entity/textChannel");
	const { Channel } = await import("../../entity/channel");
	const { ApCache } = await import("../../entity/apcache");

	const { initDatabase, closeDatabase } = await import("../../util/database");

	await initDatabase();

	if (!action) {
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

		return closeDatabase();
	}

	if (config().federation.instance_url.hostname === parsed.hostname) {
		Log.error("You can't block yourself");
		return closeDatabase();
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
			return closeDatabase();
	}

	closeDatabase();
};
