import { ObjectIsNote } from "activitypub-types";
import { DMChannel, Message } from "../../entity";
import { sendActivity } from "../../sender";
import {
	APError,
	addContext,
	buildAPAnnounceNote,
	buildAPNote,
} from "../activitypub";

/**
 * Handle a new message by validating it, sending gateway event, and sending an Announce
 */
export const handleMessage = async (message: Message) => {
	// TODO: validation

	await message.save();

	// TODO: gateway event send

	if (
		!message.reference_object ||
		!ObjectIsNote(message.reference_object.raw)
	)
		throw new APError(`e`); // TODO

	const note = message.reference_object.raw ?? buildAPNote(message);
	const announce = buildAPAnnounceNote(note, message.channel.id);
	const withContext = addContext(announce);

	let recipients;
	if (message.channel instanceof DMChannel) {
		recipients = message.channel.recipients;
	} else throw new APError("aaaaaaa!");

	recipients = recipients
		.filter((x) => x.collections?.inbox)
		.map((x) => new URL(x.collections!.inbox));

	if (!recipients.length) return;

	await sendActivity(recipients, withContext, message.channel);
};
