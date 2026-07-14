import { isAPFollow } from "@shootpub/activitypub-types/activities/follow";
import { APError } from "../../error.js";
import { resolveAPObject, resolveUrlOrObject } from "../../resolve.js";
import type { ActivityHandler } from "./index.js";

export const UndoActivityHandler: ActivityHandler = async (activity, _target) => {
	if (!activity.object) throw new APError("What are you undoing?");
	if (Array.isArray(activity.object))
		throw new APError("Don't know how to undo multiple objects");

	const inner = await resolveAPObject(resolveUrlOrObject(activity.object));

	if (!isAPFollow(inner)) throw new APError("only know how to undo follow");

	// TODO: undo the follow
};
