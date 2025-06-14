/**
 * makes a whole bunch of users in a guild
 */

import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);

import { Guild, User } from "../../entity";
import {
	closeDatabase,
	config,
	createGuildTextChannel,
	initDatabase,
	joinGuild,
	registerUser,
} from "../../util";

const GUILD_ID = "01975e61-81c4-71f4-8b0c-344ac84eb17f";
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
