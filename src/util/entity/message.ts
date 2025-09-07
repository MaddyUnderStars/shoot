import { ObjectIsNote } from "activitypub-types";
import { Attachment } from "../../entity/attachment";
import { DMChannel } from "../../entity/DMChannel";
import { Embed } from "../../entity/embed";
import { Member } from "../../entity/member";
import { Message } from "../../entity/message";
import { GuildTextChannel } from "../../entity/textChannel";
import { sendActivity } from "../../sender";
import { APError } from "../activitypub/error";
import {
	buildAPAnnounceNote,
	buildAPCreateNote,
	buildAPNote,
} from "../activitypub/transformers/message";
import { addContext } from "../activitypub/util";
import { getDatabase } from "../database";
import { generateUrlPreview } from "../embeds";
import { emitGatewayEvent } from "../events";
import { HttpError } from "../httperror";
import { createLogger } from "../log";
import { checkFileExists } from "../storage";
import { tryParseUrl } from "../url";

const log = createLogger("handleMessage");

/**
 * Handle a new message by validating it, sending gateway event, and sending an Announce
 * If federate = false then only save and distribute to our clients
 *
 * MUTATES the provided message to add the inserted database ID
 */
export const handleMessage = async (message: Message, federate = true) => {
	// validation

	if (message.files) {
		for (const file of message.files) {
			const head = await checkFileExists(message.channel.id, file.hash);
			if (!head) {
				throw new HttpError(
					`Hash ${file.hash} (${file.name}) does not exist`,
					400,
				);
			}

			if (!head.length) throw new Error("no content length");
			if (!head.type) throw new Error("no content type");

			file.size = head.length;
			file.type = head.type;
			file.width = head.width ?? null;
			file.height = head.height ?? null;
		}
	}

	if (
		message.reference_object &&
		(await Message.count({
			where: { reference_object: { id: message.reference_object.id } },
		})) !== 0
	)
		throw new APError("Already processed", 200);

	await Message.insert(message);

	// TODO: these files are already a part of the message
	// why are they not being inserted
	if (message.files) {
		for (const file of message.files) file.message = message;
		await Attachment.insert(message.files);
	}

	emitGatewayEvent(message.channel, {
		type: "MESSAGE_CREATE",
		message: message.toPublic(),
	});

	// this could be a long running task
	// and we don't care about it's result
	const embedPromise = processEmbeds(message).catch((e) => {
		log.error(e);
	});

	if (federate) {
		// don't await this here
		// as federation and embed generation doesn't need to block this func
		setImmediate(async () => {
			// we want to federate the generated embeds
			// so as to not DDOS any unsuspecting services
			// TODO: make sure to have some rules in place to make this safe
			// i.e. only allow federated embeds to contain content from the same origin as the url
			// or only render federated embeds behind a warning in the client
			await embedPromise;

			try {
				await federateMessage(message);
			} catch (_) {
				// we'll likely want to implement some sort of retry
				// or eventual mark as failed behaviour here
				log.error("FIXME: message failed to federate");
			}
		});
	}

	return message;
};

const federateMessage = async (message: Message) => {
	const note =
		message.reference_object && ObjectIsNote(message.reference_object.raw)
			? message.reference_object.raw
			: buildAPNote(message);

	if (message.channel.remote_address) {
		// We don't own this room, send create to channel

		const create = buildAPCreateNote(note);

		await sendActivity(message.channel, addContext(create), message.author);
	} else {
		// we're the owner of the channel, send the announce to each member

		const announce = buildAPAnnounceNote(note, message.channel.id);

		if (message.channel instanceof DMChannel) {
			let recipients = [
				...message.channel.recipients,
				message.channel.owner,
			];

			// remove the author's instance from the recipients
			// since they author'd it and already have a copy
			// TODO: maybe this should be used as an acknowledge instead? or send an `Acknowledge` activity?
			recipients = recipients.filter(
				(x) => x.domain !== message.author.domain,
			);

			await sendActivity(
				recipients,
				addContext(announce),
				message.channel,
			);
		} else if (message.channel instanceof GuildTextChannel) {
			// TODO: for guilds, we can't download the entire members list to do dedupe for shared inbox
			// so it would be better to do all that on the database instead
			// i.e. a query that gets all the unique domains of each member,
			// and then sends the activity of the shared inbox of that domain with all the members in the to field

			const domains: Array<{ domain: string }> =
				await getDatabase().query(
					`
				select distinct domain from users
				left join guild_members gm on "gm"."userId" = "users"."id"
				left join roles_members_guild_members rmgm on "rmgm"."guildMembersId" = "gm"."id"
				where "rmgm"."rolesId" = $1
			`,
					[message.channel.guild.id],
				);

			for (const domain of domains.map((x) => x.domain)) {
				if (domain === message.author.domain) continue;

				const recipients = await Member.find({
					where: {
						roles: {
							guild: {
								id: message.channel.guild.id,
							},
						},
						user: {
							domain,
						},
					},
					relations: { user: true },
				});

				await sendActivity(
					recipients.map((x) => x.user),
					addContext(announce),
					message.channel,
				);
			}
		}
	}
};

const URL_REGEX =
	/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMBED_TTL = 1000 * 60 * 60 * 24 * 7; // 1 week. TODO: configure

const processEmbeds = async (message: Message) => {
	if (!message.content) return;

	// get all urls in the message
	// the urls must be separated by whitespace and must not be wrapped in <>
	const urls = message.content
		.split(" ")
		.filter(
			(x) =>
				x.match(URL_REGEX) && !(x.startsWith("<") && x.endsWith(">")),
		)
		.map((x) => tryParseUrl(x))
		.filter((x) => !!x);

	const curr_time = Date.now();
	const embeds: Embed[] = [];
	for (const url of urls) {
		// check existing embed
		const existing = await Embed.findOne({
			where: { target: url.toString() },
		});

		if (existing && existing.created_at.valueOf() + EMBED_TTL > curr_time) {
			embeds.push(existing);
			continue;
		}

		const embed = await generateUrlPreview(url);

		embeds.push(embed);
	}

	await Promise.all(embeds.map((x) => x.save()));

	// TODO: I would prefer if I could just insert into the junction table
	// but then I have to guess the typeorm name for it
	// and bleh
	message.embeds = embeds;
	await message.save();

	emitGatewayEvent(message.channel, {
		type: "MESSAGE_UPDATE",
		message: {
			embeds: embeds.map((x) => x.toPublic()),
		},
	});
};
