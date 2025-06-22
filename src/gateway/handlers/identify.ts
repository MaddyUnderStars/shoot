import { makeHandler } from ".";
import { DMChannel, Session, type User } from "../../entity";
import {
	fetchRelationships,
	getDatabase,
	getGuilds,
	getUserFromToken,
} from "../../util";
import { CLOSE_CODES } from "../util/codes";
import { consume, listenEvents } from "../util/listener";
import { IDENTIFY, type READY } from "../util/validation";
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

	listenEvents(this, [
		this.user_id,
		// TODO: for relationships, see #54
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
