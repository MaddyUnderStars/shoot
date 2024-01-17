import { ObjectIsNote } from "activitypub-types";
import { ActivityHandler } from ".";
import { Channel } from "../../../../entity";
import { handleMessage } from "../../../entity";
import { APError } from "../../error";
import { resolveAPObject } from "../../resolve";
import { buildMessageFromAPNote } from "../../transformers";

export const CreateActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!(target instanceof Channel))
		throw new APError("Cannot Create<Note> to target other than channel"); // TODO

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
	await handleMessage(message);
};
