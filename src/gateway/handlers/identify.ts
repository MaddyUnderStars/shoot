import { Not } from "typeorm";
import { makeHandler } from ".";
import {
	DMChannel,
	Relationship,
	RelationshipType,
	Session,
	type User,
} from "../../entity";
import { getDatabase, getGuilds, getUserFromToken } from "../../util";
import {
	CLOSE_CODES,
	IDENTIFY,
	type READY,
	consume,
	listenEvents,
} from "../util";
import { startHeartbeatTimeout } from "./heartbeat";

/**
 * - Authenticate user
 * - Create session
 * - Get associated guilds, channels, relationships
 * - Build payload and send to user
 */
export const onIdentify = makeHandler(async function (payload) {
	let user: User;
	try {
		user = await getUserFromToken(payload.token);
	} catch (e) {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

	this.user_id = user.id;

	const [session, dmChannels, guilds, relationships] = await Promise.all([
		Session.create({
			user,
		}).save(),

		// DMChannel.find({
		// 	where: [
		// 		{ owner: { id: this.user_id } },
		// 		{ recipients: { id: this.user_id } },
		// 	],
		// 	relations: { recipients: true, owner: true },
		// }),

		getDatabase()
			.getRepository(DMChannel)
			.createQueryBuilder("dm")
			.leftJoinAndSelect("dm.owner", "owner")
			.leftJoinAndSelect("dm.recipients", "recipients")
			.where("owner.id = :user_id", { user_id: this.user_id })
			.orWhere("recipients.id = :user_id", { user_id: this.user_id })
			.getMany(),

		getGuilds(this.user_id),

		Relationship.find({
			where: [
				// We created this relationship
				{ to: { id: this.user_id } },
				//Or we are the target, and are not blocked
				{
					from: { id: this.user_id },
					from_state: Not(RelationshipType.blocked),
				},
			],
			relations: { to: true, from: true },
		}),
	]);

	this.session = session;

	const relationshipUsers = relationships.map((x) =>
		x.to.id === this.user_id ? x.from : x.to,
	);

	listenEvents(this, [
		this.user_id,
		...relationshipUsers.map((x) => x.id),
		...dmChannels.map((x) => x.id),
		...guilds.map((x) => x.id),
		...guilds.flatMap((x) => x.channels.map((y) => y.id)),
	]);

	const ret: READY = {
		type: "READY",
		session: this.session.toPrivate(),
		user: user.toPrivate(),
		channels: dmChannels.map((x) => x.toPublic()),
		guilds: guilds.map((x) => x.toPublic()),
		relationships: relationships.map((x) => x.toClient(this.user_id)),
	};

	startHeartbeatTimeout(this);

	clearTimeout(this.auth_timeout);

	return await consume(this, ret);
}, IDENTIFY);
