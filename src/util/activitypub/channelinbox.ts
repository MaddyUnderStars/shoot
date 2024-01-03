import { APActivity, ObjectIsNote } from "activitypub-types";
import { Channel } from "../../entity";
import { APError } from "./error";
import { resolveAPObject } from "./resolve";

/**
 * Valid activities to be received by channel inboxes:
 * - `Create<Note>`
 * - `Accept<Follow>`
 * - `Reject<Follow>`
 * - `Undo<Follow>`
 * - more tbd
 */
export const handleChannelInbox = async (activity: APActivity, target: Channel) => {
	if (!activity.type) throw new APError("Activity does not have type");
	if (Array.isArray(activity.type))
		throw new APError("Activity has multiple types, cannot handle");

	const handler = handlers[activity.type.toLowerCase()];
	if (!handler)
		throw new APError(`Activity of type ${activity.type} has no handler`);

	await handler(activity, target);
};

const handlers: {
	[key: string]: (activity: APActivity, target: Channel) => Promise<unknown>;
} = {
	create: async (activity, target) => {
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

		// todo: finish
	},
};
