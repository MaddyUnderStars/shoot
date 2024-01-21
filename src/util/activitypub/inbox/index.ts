import { APActivity } from "activitypub-types";
import { Actor, ApCache } from "../../../entity";
import { APError } from "../error";
import { ActivityHandlers } from "./handlers";

export const handleInbox = async (activity: APActivity, target: Actor) => {
	delete activity["@context"];

	if (!activity.type) throw new APError("Activity does not have type");
	if (Array.isArray(activity.type))
		throw new APError("Activity has multiple types, cannot handle");

	const handler =
		ActivityHandlers[activity.type.toLowerCase() as Lowercase<string>];
	if (!handler)
		throw new APError(`Activity of type ${activity.type} has no handler`);

	await ApCache.create({
		id: activity.id,
		raw: activity,
	}).save();

	await handler(activity, target);
};
