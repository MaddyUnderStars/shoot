import { ObjectIsNote } from "activitypub-types";
import { DMChannel, Message, type Actor } from "../../entity";
import { sendActivity } from "../../sender";
import {
	APError,
	addContext,
	buildAPAnnounceNote,
	buildAPCreateNote,
	buildAPNote,
} from "../activitypub";
import { emitGatewayEvent } from "../events";

/**
 * Handle a new message by validating it, sending gateway event, and sending an Announce
 * If federate = false then only save and distribute to our clients
 */
export const handleMessage = async (message: Message, federate = true) => {
	// TODO: validation

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

	if (!federate) return;

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

		let recipients: Array<Actor> =
			message.channel instanceof DMChannel
				? [...message.channel.recipients, message.channel.owner]
				: [];

		// remove the author's instance from the recipients
		// since they author'd it and already have a copy
		// TODO: maybe this should be used as an acknowledge instead? or send an `Acknowledge` activity?
		recipients = recipients.filter(
			(x) => x.domain !== message.author.domain,
		);

		await sendActivity(recipients, addContext(announce), message.channel);
	}
};
