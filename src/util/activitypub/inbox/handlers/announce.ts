import { ObjectIsNote } from "activitypub-types";
import { ActivityHandler } from ".";
import { User } from "../../../../entity";
import { getOrFetchChannel, handleMessage } from "../../../entity";
import { APError } from "../../error";
import { resolveAPObject } from "../../resolve";
import { buildMessageFromAPNote } from "../../transformers";

/**
 * Channels Announce to Users to send notification of new messages
 * Saves these messages to db to the actor channel
 */
export const AnnounceActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!(target instanceof User))
		throw new APError("Cannot Announce to target other than User");

	if (!activity.object)
		throw new APError(
			"Announce activity does not contain `object`. What are we announcing?",
		);

	if (Array.isArray(activity.object))
		throw new APError("Cannot accept Announce with multiple `object`s");

	const inner = await resolveAPObject(activity.object);

	if (!ObjectIsNote(inner))
		throw new APError(`Cannot accept Announce<${inner.type}>`);

	if (!activity.actor)
		throw new APError("Cannot accept Announce without `actor`.");

	if (Array.isArray(activity.actor))
		throw new APError("Cannot accept Announce with multiple `actor`s");

	if (typeof activity.actor != "string")
		throw new APError("Cannot accept Announce with non-string actor");

	const channel = await getOrFetchChannel(activity.actor);

	const message = await buildMessageFromAPNote(inner, channel);

	await handleMessage(message, false);
};
