import { User } from "../../../../entity/user.js";
import { getOrFetchChannel } from "../../../entity/channel.js";
import { handleMessage } from "../../../entity/message.js";
import { APError } from "../../error.js";
import { resolveAPObject, resolveId, resolveUrlOrObject } from "../../resolve.js";
import { buildMessageFromAPNote } from "../../transformers/message.js";
import { isChatMessage } from "../../types/APMessage.js";
import type { ActivityHandler } from "./index.js";

/**
 * Channels Announce to Users to send notification of new messages
 * Saves these messages to db to the actor channel
 */
export const AnnounceActivityHandler: ActivityHandler = async (activity, target) => {
	if (!(target instanceof User)) throw new APError("Cannot Announce to target other than User");

	if (!activity.object)
		throw new APError("Announce activity does not contain `object`. What are we announcing?");

	if (Array.isArray(activity.object))
		throw new APError("Cannot accept Announce with multiple `object`s");

	const inner = await resolveAPObject(resolveUrlOrObject(activity.object));

	if (!isChatMessage(inner)) throw new APError(`Cannot accept Announce<${inner.type}>`);

	if (!activity.actor) throw new APError("Cannot accept Announce without `actor`.");

	if (Array.isArray(activity.actor))
		throw new APError("Cannot accept Announce with multiple `actor`s");

	if (typeof activity.actor !== "string")
		throw new APError("Cannot accept Announce with non-string actor");

	const channel = await getOrFetchChannel(resolveId(activity.actor));

	const message = await buildMessageFromAPNote(inner, channel);

	await handleMessage(message, false);
};
