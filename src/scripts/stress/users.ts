/**
 * makes a whole bunch of users in a guild
 */

import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);

import { Guild, User } from "../../entity";
import { closeDatabase, config, initDatabase, joinGuild } from "../../util";

const GUILD_ID = "01977599-db47-7058-a177-97e6f3e1ea7c";
(async () => {
	await initDatabase();

	const guild = await Guild.findOneOrFail({ where: { id: GUILD_ID } });

	for (let i = 0; i < 1000; i++) {
		console.log(i);

		const name = `test_${i}_${Date.now()}`;

		const user = await User.create({
			name,
			email: "",
			password_hash: "test",
			public_key: "", // The key has yet to be generated.

			display_name: name,
			valid_tokens_since: new Date(),
			domain: config.federation.webapp_url.hostname,
		}).save();

		await joinGuild(user.id, guild.id);
	}

	closeDatabase();
})();
