import {
	APActivity,
	APActor,
	ObjectIsGroup,
	ObjectIsNote,
} from "activitypub-types";
import { ActivityHandler } from ".";
import { Channel, User } from "../../../../entity";
import { createChannelFromRemoteGroup, handleMessage } from "../../../entity";
import { emitGatewayEvent } from "../../../events";
import { PERMISSION } from "../../../permission";
import { APError } from "../../error";
import { resolveAPObject } from "../../resolve";
import { buildMessageFromAPNote } from "../../transformers";

/**
 * External users Create<Note> at a channel
 * the channel Announces that note and sends to channel members
 */
export const CreateActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (target instanceof Channel) {
		return await CreateAtChannel(activity, target);
	} else if (target instanceof User) {
		return await CreateAtUser(activity, target);
	}
};

const CreateAtUser = async (activity: APActivity, target: User) => {
	if (!activity.object)
		throw new APError(
			"Create activity does not contain `object`. What are we creating?",
		);

	if (Array.isArray(activity.object))
		throw new APError(
			"Cannot accept Create activity with multiple `object`s",
		);

	// TOOD: typing
	if (!ObjectIsGroup(activity.object as any))
		throw new APError("Must create group at users");

	const inner = await createChannelFromRemoteGroup(
		activity.object as APActor,
	);

	await inner.save();

	emitGatewayEvent([target.id], {
		type: "CHANNEL_CREATE",
		channel: inner.toPublic(),
	});
};

const CreateAtChannel = async (activity: APActivity, target: Channel) => {
	if (!activity.object)
		throw new APError(
			"Create activity does not contain `object`. What are we creating?",
		);

	if (Array.isArray(activity.object))
		throw new APError(
			"Cannot accept Create activity with multiple `object`s",
		);

	const inner = await resolveAPObject(activity.object);

	if (!ObjectIsNote(inner))
		throw new APError(`Cannot accept Create<${inner.type}>`);

	const message = await buildMessageFromAPNote(inner, target);

	target.throwPermission(message.author, [
		PERMISSION.VIEW_CHANNEL,
		PERMISSION.SEND_MESSAGES,
	]);

	await handleMessage(message);
};
