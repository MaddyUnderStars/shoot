import { DMChannel } from "../../entity/DMChannel";
import { Session } from "../../entity/session";
import type { User } from "../../entity/user";
import { getDatabase } from "../../util/database";
import { getGuilds } from "../../util/entity/guild";
import { fetchRelationships } from "../../util/entity/relationship";
import { getUserFromToken } from "../../util/token";
import { CLOSE_CODES } from "../util/codes";
import { consume, listenEvents } from "../util/listener";
import { IDENTIFY } from "../util/validation/receive";
import type { READY } from "../util/validation/send";
import { makeHandler } from ".";
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
	} catch (_) {
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

	listenEvents(this, [
		user,
		// TODO: for relationships, see #54
		...dmChannels,
		...guilds,
		...guilds.flatMap((x) => x.channels),
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
