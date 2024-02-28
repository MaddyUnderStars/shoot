import { makeHandler } from ".";
import { DMChannel, Session } from "../../entity";
import { getDatabase, getUserFromToken } from "../../util";
import { CLOSE_CODES, IDENTIFY, READY, consume, listenEvents } from "../util";
import { startHeartbeatTimeout } from "./heartbeat";

/**
 * - Authenticate user
 * - Create session
 * - Get associated guilds, channels, relationships
 * - Build payload and send to user
 */
export const onIdentify = makeHandler(async function (payload) {
	let user;
	try {
		user = await getUserFromToken(payload.token);
	} catch (e) {
		this.close(CLOSE_CODES.BAD_TOKEN);
		return;
	}

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

	listenEvents(
		this,
		[...dmChannels].map((x) => x.id),
	);

	const ret: READY = {
		type: "READY",
		session: this.session.toPrivate(),
		user: user.toPrivate(),
		channels: dmChannels.map((x) => x.toPublic()),
	};

	startHeartbeatTimeout(this);

	clearTimeout(this.auth_timeout);

	return await consume(this, ret);
}, IDENTIFY);
