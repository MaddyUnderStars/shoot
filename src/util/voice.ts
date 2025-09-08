import type { APJoin } from "activitypub-types";
import jwt from "jsonwebtoken";
import { Channel } from "../entity/channel";
import { User } from "../entity/user";
import { getExternalPathFromActor, sendActivity } from "../sender";
import { APError } from "./activitypub/error";
import { addContext, splitQualifiedMention } from "./activitypub/util";
import { config } from "./config";
import { getDatabase } from "./database";
import { HttpError } from "./httperror";
import { PERMISSION } from "./permission";
import { makeInstanceUrl } from "./url";

const algorithm = "HS256";

type MediaTokenData = {
	user_mention: string;
	channel_id: string;
	iat: number;
};

/**
 * Send a Join activity to the Channel inbox
 * Expected: Receive an Accept<Join> in our user inbox with a media token
 */
export const askForMediaToken = async (user: User, channel: Channel) => {
	if (!channel.remote_address)
		throw new APError("getMediaTokenFromRemote called with local channel");

	const join_ap: APJoin = {
		type: "Join",
		actor: makeInstanceUrl(getExternalPathFromActor(user)),
		object: channel.remote_address,
	};

	await sendActivity(channel, addContext(join_ap), user);
};

const INVALID_TOKEN = new HttpError("Invalid token", 401);

export const validateMediaToken = (
	token: string,
): Promise<{ user: User; channel: Channel }> =>
	new Promise((resolve, reject) => {
		jwt.verify(
			token,
			config.security.jwt_secret,
			{ algorithms: [algorithm] },
			async (err, out) => {
				const decoded = out as MediaTokenData;
				if (err || !decoded) return reject(INVALID_TOKEN);

				const mention = splitQualifiedMention(decoded.user_mention);

				const user = await User.findOne({
					where: { name: mention.id, domain: mention.domain },
				});

				if (!user) return reject(INVALID_TOKEN);

				const channel = await getDatabase()
					.createQueryBuilder(Channel, "channels")
					.select("channels")
					.leftJoinAndSelect("channels.recipients", "recipients")
					.leftJoinAndSelect("channels.owner", "owner")
					.leftJoinAndSelect("channels.guild", "guild")
					.leftJoinAndSelect("guild.owner", "guild_owner")
					.where("channels.id = :id", { id: decoded.channel_id })
					.getOne();

				if (!channel) return reject(INVALID_TOKEN);

				if (
					!(await channel.checkPermission(user, [
						PERMISSION.CALL_CHANNEL,
						PERMISSION.VIEW_CHANNEL,
					]))
				)
					return reject(INVALID_TOKEN);

				// Tokens have a limited lifespan (10 minutes here)
				// If you want to rejoin a call, just POSt /call again and get a new token
				if (decoded.iat * 1000 < Date.now() - 10 * 1000)
					return reject(INVALID_TOKEN);

				return resolve({ user, channel });
			},
		);
	});

export const generateMediaToken = (
	user_mention: string,
	channel_id: string,
): Promise<string> => {
	const iat = Math.floor(Date.now() / 1000);

	return new Promise((res, rej) =>
		jwt.sign(
			{ user_mention, channel_id, iat },
			config.security.jwt_secret,
			{ algorithm },
			(err, token) => {
				if (err || !token) return rej(err);
				return res(token);
			},
		),
	);
};
