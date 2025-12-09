import { Queue } from "bullmq";
import { DMChannel } from "../entity/DMChannel";
import type { Message } from "../entity/message";
import { GuildTextChannel } from "../entity/textChannel";
import { User } from "../entity/user";
import {
	ChannelNotificationPreferences,
	UserChannelSettings,
} from "../entity/userChannelSettings";
import {
	type ActorMention,
	ActorMentionRegex,
} from "../util/activitypub/constants";
import { splitQualifiedMention } from "../util/activitypub/util";
import { config } from "../util/config";
import { PERMISSION } from "../util/permission";
import type { PushNotificationJobData } from "./worker";

export const sendNotifications = async (message: Message) => {
	const promises = new Map<ActorMention, Promise<void>>();

	if (message.channel instanceof DMChannel) {
		// we should notify all the recipients in this chat

		const recipients = message.channel.recipients.filter(
			(x) => x.id !== message.author.id,
		);

		for (const recipient of recipients) {
			if (promises.has(recipient.mention)) continue;

			promises.set(recipient.mention, queueNotif(recipient, message));
		}
	}

	const mentions =
		message.content?.split(" ").filter(
			(x) =>
				// match actor mentions that begin with @
				// TODO: maybe change the regex instead
				x.charAt(0) === "@" && x.slice(1).match(ActorMentionRegex),
		) ?? [];

	for (const mention of mentions) {
		const m = mention.slice(1) as ActorMention;

		if (promises.has(m)) continue;

		const split = splitQualifiedMention(mention);

		const user = await User.findOne({
			where: {
				name: split.id,
				domain: split.domain,
			},
		});

		if (!user) continue;

		// if the user can't see this channel, prevent pinging them
		if (
			await message.channel.checkPermission(user, PERMISSION.VIEW_CHANNEL)
		)
			promises.set(user.mention, queueNotif(user, message, true));
	}

	await Promise.all(promises);
};

const queueNotif = async (user: User, message: Message, isMention = false) => {
	if (user.isRemote()) return;

	const queue = getNotificationQueue();
	if (!queue) return;

	const settings = await UserChannelSettings.findOne({
		where: {
			channelId: message.channel.id,
			userSettingsUserId: user.id,
		},
	});

	/**
	 * (if this channel is muted) or (we have disabled notifications)
	 * or (we have asked for only mentions AND this is not a mention)
	 * then skip it
	 */
	if (
		(settings?.muted_until ?? 0) > new Date() ||
		settings?.notifications === ChannelNotificationPreferences.NONE ||
		(settings?.notifications ===
			ChannelNotificationPreferences.ONLY_MENTIONS &&
			!isMention)
	)
		return;

	await queue.add(`${user.mention}-${Date.now()}`, {
		user: user.mention,
		notification: {
			title:
				message.channel instanceof DMChannel
					? message.channel.name
					: `${message.channel.name}: ${message.author.display_name}`,
			body: message.content ?? "[You were mentioned]",
			sent: message.published.valueOf(),

			channel: message.channel.mention,
			guild:
				message.channel instanceof GuildTextChannel
					? message.channel.guild.mention
					: undefined,
			author: message.author.mention,
		},
	});
};

let NOTIFICATION_QUEUE: Queue | null;
const getNotificationQueue = () => {
	if (NOTIFICATION_QUEUE) return NOTIFICATION_QUEUE;

	NOTIFICATION_QUEUE = config.notifications.enabled
		? new Queue<PushNotificationJobData>("notifications", {
				connection: {
					host: config.redis.host,
					port: config.redis.port,
				},
			})
		: null;

	return NOTIFICATION_QUEUE;
};
