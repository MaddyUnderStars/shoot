import {
	type APActivity,
	ObjectIsGroup,
	ObjectIsNote,
} from "activitypub-types";
import type { ActivityHandler } from ".";
import { Channel, DMChannel, User } from "../../../../entity";
import {
	createChannelFromRemoteGroup,
	createDmChannel,
	getOrFetchUser,
	handleMessage,
} from "../../../entity";
import { emitGatewayEvent } from "../../../events";
import { PERMISSION } from "../../../permission";
import { APError } from "../../error";
import { resolveAPObject, resolveId } from "../../resolve";
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
	}

	if (target instanceof User) {
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

	const inner = await resolveAPObject(activity.object);

	if (ObjectIsGroup(inner)) {
		// Create<Group> at User
		// We are creating a DM channel
		const channel = await createChannelFromRemoteGroup(inner);

		await channel.save();

		emitGatewayEvent([target.id], {
			type: "CHANNEL_CREATE",
			channel: channel.toPublic(),
		});

		return;
	}

	if (ObjectIsNote(inner)) {
		// Create<Note> at User
		// This activity is probably from Mastodon or other foreign software
		// In this case, create a dm channel if it doesn't exist
		// and then send this message to it

		if (!activity.actor) throw new APError("Must have an actor (author)");

		if (Array.isArray(activity.actor))
			throw new APError("Don't know how to handle multiple authors.");

		const sender = await getOrFetchUser(resolveId(activity.actor));

		let channel = await DMChannel.findOne({
			where: [
				{
					owner: { id: sender.id },
					recipients: { id: target.id },
				},
				{
					owner: { id: target.id },
					recipients: { id: sender.id },
				},
			],
		});

		if (!channel) {
			// make it since it doesn't exist
			channel = await createDmChannel(
				sender.display_name, // TODO
				sender,
				[target],
			);

			await channel.save();

			emitGatewayEvent([target.id], {
				type: "CHANNEL_CREATE",
				channel: channel.toPublic(),
			});
		}

		const message = await buildMessageFromAPNote(inner, channel);

		await handleMessage(message);
	}
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

	await target.throwPermission(message.author, [
		PERMISSION.VIEW_CHANNEL,
		PERMISSION.SEND_MESSAGES,
	]);

	await handleMessage(message);
};
