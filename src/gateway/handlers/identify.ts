import { In } from "typeorm";
import { DMChannel } from "../../entity/DMChannel.js";
import { Role } from "../../entity/role.js";
import { Session } from "../../entity/session.js";
import type { User } from "../../entity/user.js";
import { VoiceState } from "../../entity/voiceState.js";
import type { ActorMention } from "../../util/activitypub/constants.js";
import { getDatabase } from "../../util/database.js";
import { getGuilds } from "../../util/entity/guild.js";
import { fetchRelationships } from "../../util/entity/relationship.js";
import { listenGatewayEvent, makeGatewayTarget } from "../../util/events.js";
import { getUserFromToken } from "../../util/token.js";
import { CLOSE_CODES } from "../util/codes.js";
import { makeHandler } from "../util/handler.js";
import { consume, listenEvents } from "../util/listener.js";
import { IDENTIFY } from "../util/validation/receive.js";
import type { READY } from "../util/validation/send.js";
import { startHeartbeatTimeout } from "./heartbeat.js";

/**
 * - Authenticate user
 * - Create session
 * - Get associated guilds, channels, relationships
 * - Build payload and send to user
 */
export const onIdentify = makeHandler(async function (payload) {
	clearTimeout(this.auth_timeout);

	let user: User;
	try {
		user = await getUserFromToken(payload.token);
	} catch {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

	this.user_id = user.id;
	this.user_mention = user.mention;

	const [session, dmChannels, guilds, relationships] = await Promise.all([
		Session.create({
			user,
		}).save(),

		getDatabase()
			.getRepository(DMChannel)
			.createQueryBuilder("dm")
			.leftJoinAndSelect("dm.owner", "owner")
			.leftJoinAndSelect("dm.recipients", "recipients")
			.where("owner.id = :user_id", { user_id: this.user_id })
			.orWhere("recipients.id = :user_id", { user_id: this.user_id })
			.getMany(),

		getGuilds(this.user_id),

		fetchRelationships(this.user_id),
	]);

	this.session = session;

	const rawVoiceState: Array<{
		channel_id: string;
		channel_domain: string;
		channel_remote_id?: string;
		users: ActorMention[];
	}> = !dmChannels.length
		? []
		: await getDatabase()
				.getRepository(VoiceState)
				.createQueryBuilder("voice")
				.leftJoin("voice.channel", "channel")
				.leftJoinAndSelect("voice.user", "user")
				.where("channel.id IN (:...channel_ids)", {
					// TODO: guild voice states
					channel_ids: dmChannels.map((x) => x.id),
				})
				.groupBy("channel.id")
				.select([
					"channel.id",
					"channel.domain",
					"channel.remote_id",
					"array_agg(user.id) as users",
				])
				.getRawMany();

	const voiceState: Record<ActorMention, ActorMention[]> = {};
	for (const row of rawVoiceState) {
		const mention: ActorMention = `${row.channel_remote_id ?? row.channel_id}@${row.channel_domain}`;

		voiceState[mention] = row.users;
	}

	const roles = Object.groupBy(
		await Role.find({
			where: { guild: { id: In(guilds.map((x) => x.id)) } },
			loadRelationIds: {
				disableMixedMap: true,
			},
		}),
		(role) => role.guild.id,
	);

	for (const guildId in roles) {
		if (!roles[guildId]) continue;

		const guild = guilds.find((x) => x.id === guildId);
		if (!guild) continue; //shouldn't happen

		guild.roles = roles[guildId];
	}

	const ret: READY = {
		type: "READY",
		session: this.session.toPrivate(),
		user: user.toPrivate(),
		channels: dmChannels.map((x) => x.toPublic()),
		guilds: guilds.map((x) => x.toPublic()),
		relationships: relationships.map((x) => x.toClient(this.user_id)),
		voice: voiceState,
	};

	startHeartbeatTimeout(this);

	await consume(this, ret);

	listenEvents(this, [
		// this user target is emitted to for events about us that are NOT private
		user,
		// we receive non-private events from these users
		...relationships.map((x) => (x.from.id === user.id ? x.to : x.from)),
		...dmChannels,
		...guilds,
		...guilds.flatMap((x) => x.channels),
	]);

	// this user target is the private target for events only we should see
	// directly calling consume(ourSocket) doesn't cause problems
	// however if we want a private event to only us via emitGatewayEvent
	// then this is required
	const target = `${makeGatewayTarget(user)}-only`;
	this.events[target] = listenGatewayEvent(target, consume.bind(null, this));
}, IDENTIFY);
