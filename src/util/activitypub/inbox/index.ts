import { Queue } from "bullmq";
import { z } from "zod";
import type { Actor } from "../../../entity/actor.js";
import { ApCache } from "../../../entity/apcache.js";
import type { APInboundJobData } from "../../../receiver/index.js";
import { config } from "../../config.js";
import { APError } from "../error.js";
import { ActivityHandlers } from "./handlers/index.js";
import { APActivity } from "@shootpub/activitypub-types/activity";

const getQueue = () => {
	return config().federation.queue.use_inbound
		? new Queue<APInboundJobData>("inbound", {
				connection: {
					host: config().redis.host,
					port: config().redis.port,
				},
			})
		: null;
};

export const AP_ACTIVITY = z.looseObject({
	id: z.url(),
	type: z.string().refine((type) => !!ActivityHandlers[type.toLowerCase() as Lowercase<string>], {
		message: "Activity of that type has no handler",
	}),
	actor: z.url().or(z.looseObject({ id: z.url() })),
});

export const handleInbox = async (activity: APActivity, target: Actor) => {
	activity["@context"] = undefined;

	const safeActivity = AP_ACTIVITY.parse(activity);

	const queue = getQueue();
	if (queue)
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
		} catch {
			throw new APError(`Activity with id ${safeActivity.id} already processed`);
		}

		const handler = ActivityHandlers[safeActivity.type.toLowerCase() as Lowercase<string>];

		if (!handler) {
			throw new APError(`Activity type ${safeActivity.type} has no handler`);
		}

		await handler(activity, target);
	}
};
