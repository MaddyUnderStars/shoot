import { makeHandler } from ".";
import { DMChannel, Session } from "../../entity";
import { getDatabase, getUserFromToken } from "../../util";
import { IDENTIFY, READY, consume, listenEvents } from "../util";
import { heartbeatTimeout } from "./heartbeat";

/**
 * - Authenticate user
 * - Create session
 * - Get associated guilds, channels, relationships
 * - Build payload and send to user
 */
export const onIdentify = makeHandler(async function (payload) {
	const user = await getUserFromToken(payload.token);
	this.user_id = user.id;

	const [session, dmChannels] = await Promise.all([
		Session.create({
			user,
		}).save(),

		getDatabase()
			.createQueryBuilder(DMChannel, "dm")
			.leftJoinAndSelect(
				"dm.recipients",
				"recipients",
				"recipients.id = :id",
				{
					id: user.id,
				},
			)
			.leftJoinAndSelect("dm.owner", "owner")
			.getMany(),

		// TODO: guilds, relationships
	]);

	this.session = session;

	await listenEvents(
		this,
		[...dmChannels].map((x) => x.id),
	);

	const ret: READY = {
		type: "READY",
		session: this.session.toPrivate(),
		user: user.toPrivate(),
		channels: dmChannels.map((x) => x.toPublic()),
	};

	this.heartbeat_timeout = setTimeout(() => heartbeatTimeout(this), 5000);

	clearTimeout(this.auth_timeout);

	return await consume(this, ret);
}, IDENTIFY);
