import { ObjectIsNote } from "activitypub-types";
import type { ActivityHandler } from ".";
import { User } from "../../../../entity/user";
import { getOrFetchChannel } from "../../../entity/channel";
import { handleMessage } from "../../../entity/message";
import { APError } from "../../error";
import { resolveAPObject, resolveId, resolveUrlOrObject } from "../../resolve";
import { buildMessageFromAPNote } from "../../transformers/message";

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

	const inner = await resolveAPObject(resolveUrlOrObject(activity.object));

	if (!ObjectIsNote(inner))
		throw new APError(`Cannot accept Announce<${inner.type}>`);

	if (!activity.actor)
		throw new APError("Cannot accept Announce without `actor`.");

	if (Array.isArray(activity.actor))
		throw new APError("Cannot accept Announce with multiple `actor`s");

	if (typeof activity.actor !== "string")
		throw new APError("Cannot accept Announce with non-string actor");

	const channel = await getOrFetchChannel(resolveId(activity.actor));

	const message = await buildMessageFromAPNote(inner, channel);

	await handleMessage(message, false);
};
