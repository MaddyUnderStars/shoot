import { Like } from "typeorm";
import { createLogger } from "../../util";
import { InstanceBehaviour } from "../../util/activitypub/instances";
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

	const { User, Guild, DMChannel, GuildTextChannel, Channel, ApCache } =
		await import("../../entity");
	const { initDatabase } = await import("../../util/database");

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

		return;
	}

	if (config.federation.instance_url.hostname === parsed.hostname)
		throw new Error("You can't block yourself!");

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
