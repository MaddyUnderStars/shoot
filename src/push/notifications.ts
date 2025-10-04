import { Queue } from "bullmq";
import { DMChannel } from "../entity/DMChannel";
import type { Message } from "../entity/message";
import { GuildTextChannel } from "../entity/textChannel";
import { User } from "../entity/user";
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

			promises.set(
				recipient.mention,
				queueNotif(recipient.mention, message),
			);
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
			promises.set(m, queueNotif(m, message));
	}

	await Promise.all(promises);
};

const queueNotif = async (user: ActorMention, message: Message) => {
	const { domain } = splitQualifiedMention(user);

	if (domain !== config.federation.instance_url.hostname) return;

	const queue = getNotificationQueue();

	if (!queue) return;

	await queue.add(`${user}-${Date.now()}`, {
		user,
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
