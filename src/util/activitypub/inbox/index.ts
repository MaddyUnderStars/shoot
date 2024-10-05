import type { APActivity } from "activitypub-types";
import { Queue } from "bullmq";
import { z } from "zod";
import { type Actor, ApCache } from "../../../entity";
import type { APInboundJobData } from "../../../receiver";
import { config } from "../../config";
import { APError } from "../error";
import { ActivityHandlers } from "./handlers";

const queue = new Queue<APInboundJobData>("inbound");

export const AP_ACTIVITY = z
	.object({
		id: z.string().url(),
		type: z
			.string()
			.refine(
				(type) =>
					!!ActivityHandlers[type.toLowerCase() as Lowercase<string>],
				{ message: "Activity of that type has no handler" },
			),
	})
	.passthrough();

export const handleInbox = async (activity: APActivity, target: Actor) => {
	activity["@context"] = undefined;

	const safeActivity = AP_ACTIVITY.parse(activity);

	if (config.federation.queue?.use_inbound)
		await queue.add(`${safeActivity.type}-${target.id}-${Date.now()}`, {
			activity: safeActivity,
			target_id: target.id,
		});
	else {
		try {
			await ApCache.insert({
				id: safeActivity.id,
				raw: safeActivity,
			});
		} catch (e) {
			throw new APError(
				`Activity with id ${safeActivity.id} already processed`,
			);
		}

		await ActivityHandlers[
			safeActivity.type.toLowerCase() as Lowercase<string>
		](activity, target);
	}
};
