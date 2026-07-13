import { In } from "typeorm";
import { User } from "../../entity/user.js";
import { VoiceState } from "../../entity/voiceState.js";
import type { ActorMention } from "../../util/activitypub/constants.js";
import { getDatabase } from "../../util/database.js";
import { getOrFetchGuild } from "../../util/entity/guild.js";
import { PERMISSION } from "../../util/permission.js";
import { makeHandler } from "../util/handler.js";
import { consume } from "../util/listener.js";
import { VOICE_QUERY } from "../util/validation/receive.js";
import type { VOICE_STATE } from "../util/validation/send.js";

export const onVoiceQuery = makeHandler(async function (payload) {
	const guild = await getOrFetchGuild(payload.guild);
	if (!guild) throw new Error("Guild does not exist");

	const channels = [];

	for (const channel of guild.channels) {
		channel.guild = guild;

		if (
			await channel.checkPermission(
				User.create({ id: this.user_id }),
				PERMISSION.VIEW_CHANNEL,
			)
		)
			channels.push(channel);
	}

	const voiceStates: Array<{
		channel_id: string;
		channel_domain: string;
		channel_remote_id?: string;
		users: string[];
	}> = await getDatabase()
		.getRepository(VoiceState)
		.createQueryBuilder("voice")
		.leftJoin("voice.channel", "channel")
		.leftJoinAndSelect("voice.user", "user")
		.where("channel.id IN (:...channel_ids)", {
			channel_ids: channels.map((x) => x.id),
		})
		.groupBy("channel.id")
		.select([
			"channel.id",
			"channel.domain",
			"channel.remote_id",
			"array_agg(user.id) as users",
		])
		.getRawMany();

	const ret: VOICE_STATE = {
		type: "VOICE_STATE",
		states: {},
	};

	for (const row of voiceStates) {
		const mention: ActorMention = `${row.channel_remote_id ?? row.channel_id}@${row.channel_domain}`;

		ret.states[mention] = (
			await User.find({
				where: {
					id: In(row.users),
				},
			})
		).map((x) => x.toPublic());
	}

	return await consume(this, ret);
}, VOICE_QUERY);
