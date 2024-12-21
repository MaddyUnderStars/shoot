import { ObjectIsNote } from "activitypub-types";
import { DMChannel, GuildTextChannel, Member, Message } from "../../entity";
import { sendActivity } from "../../sender";
import {
	APError,
	addContext,
	buildAPAnnounceNote,
	buildAPCreateNote,
	buildAPNote,
} from "../activitypub";
import { getDatabase } from "../database";
import { emitGatewayEvent } from "../events";
import { HttpError } from "../httperror";
import { checkFileExists } from "../storage";

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

			if (!head.ContentLength) throw new Error("no content length");
			if (!head.ContentType) throw new Error("no content type");

			file.size = head.ContentLength;
			file.width = head.Metadata?.width
				? Number.parseInt(head.Metadata?.width)
				: null;
			file.height = head.Metadata?.height
				? Number.parseInt(head.Metadata?.height)
				: null;

			file.type = head.ContentType;
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

	emitGatewayEvent(message.channel.id, {
		type: "MESSAGE_CREATE",
		message: message.toPublic(),
	});

	if (federate) await federateMessage(message);

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
