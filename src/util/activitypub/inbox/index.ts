import type { APActivity } from "activitypub-types";
import { Queue } from "bullmq";
import { type Actor, ApCache } from "../../../entity";
import type { APInboundJobData } from "../../../receiver";
import { APError } from "../error";
import { ActivityHandlers } from "./handlers";

const queue = new Queue<APInboundJobData>("inbound");

export const handleInbox = async (activity: APActivity, target: Actor) => {
	activity["@context"] = undefined;

	if (!activity.type) throw new APError("Activity does not have type");
	if (Array.isArray(activity.type))
		throw new APError("Activity has multiple types, cannot handle");

	if (!activity.id) throw new APError("Activity does not have id");

	const handler =
		ActivityHandlers[activity.type.toLowerCase() as Lowercase<string>];
	if (!handler)
		throw new APError(`Activity of type ${activity.type} has no handler`);

	try {
		await ApCache.insert({
			id: activity.id,
			raw: activity,
		});
	} catch (e) {
		throw new APError(`Activity with id ${activity.id} already processed`);
	}

	await queue.add(`${activity.type}-${target.id}-${Date.now()}`, {
		activity,
		target_id: target.id,
	});
};
