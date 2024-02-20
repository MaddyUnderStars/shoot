import { ObjectIsNote } from "activitypub-types";
import { DMChannel, Message } from "../../entity";
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
		})) != 0
	)
		throw new APError("Already processed", 200);

	await Message.insert(message);

	emitGatewayEvent(message.channel.id, {
		type: "MESSAGE_CREATE",
		message: message.toPublic(),
	});

	if (!federate) return;

	let recipients;
	if (message.channel instanceof DMChannel) {
		recipients = [message.channel]; //.recipients;
	} else throw new APError("aaaaaaa!");

	recipients = recipients
		.filter((x) => x.collections?.inbox)
		.map((x) => new URL(x.collections!.inbox));

	if (!recipients.length) return;

	let note;
	if (message.reference_object && ObjectIsNote(message.reference_object.raw))
		note = message.reference_object.raw;
	else note = buildAPNote(message);

	const announce = buildAPAnnounceNote(note, message.channel.id);

	await sendActivity(
		recipients,
		addContext(buildAPCreateNote(note)),
		message.author,
	);

	await sendActivity(recipients, addContext(announce), message.channel);
};
