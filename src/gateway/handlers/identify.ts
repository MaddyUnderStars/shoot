import { z } from "zod";
import { makeHandler } from ".";
import {
	DMChannel,
	PrivateSession,
	PrivateUser,
	PublicChannel,
	Session,
} from "../../entity";
import { getDatabase, getUserFromToken } from "../../util";

const IdentifyPayload = z.object({
	op: z.literal("identify"),

	/** User token to use to login */
	token: z.string(),
});

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
			.leftJoin("dm.recipients", "recipients", "recipients.id = :id", {
				id: user.id,
			})
			.getMany(),

		// TODO: guilds, relationships
	]);

	this.session = session;

	const ret: ReadyPayload = {
		session: this.session.toPrivate(),
		user: user.toPrivate(),
		channels: dmChannels.map((x) => x.toPublic()),
	};

	clearTimeout(this.auth_timeout);

	return this.send(ret);
}, IdentifyPayload);

export type ReadyPayload = {
	/** The authenticated user */
	user: PrivateUser;

	/** The session associated with this connection */
	session: PrivateSession;

	/** DM channels this user is a part of */
	channels: Array<PublicChannel>;

	// TODO: guilds, relationships
};
