import { ActivityIsFollow } from "activitypub-types";
import type { ActivityHandler } from ".";
import { APError } from "../../error";
import { resolveAPObject } from "../../resolve";

export const UndoActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!activity.object) throw new APError("What are you undoing?");
	if (Array.isArray(activity.object))
		throw new APError("Don't know how to undo multiple objects");

	const inner = await resolveAPObject(activity.object);

	if (!ActivityIsFollow(inner))
		throw new APError("only know how to undo follow");

	// TODO: undo the follow
};
