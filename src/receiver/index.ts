import type { APActivity } from "activitypub-types";
import { type Job, Worker } from "bullmq";
import { APError, config, findActorOfAnyType } from "../util";
import { ActivityHandlers } from "../util/activitypub/inbox/handlers";

export type APInboundJobData = { activity: APActivity; target_id: string };

const worker = new Worker("inbound", async (job: Job<APInboundJobData>) => {
	const { activity, target_id } = job.data;

	activity["@context"] = undefined;

	if (!activity.type) throw new APError("Activity does not have type");
	if (Array.isArray(activity.type))
		throw new APError("Activity has multiple types, cannot handle");

	if (!activity.id) throw new APError("Activity does not have id");

	const handler =
		ActivityHandlers[activity.type.toLowerCase() as Lowercase<string>];
	if (!handler)
		throw new APError(`Activity of type ${activity.type} has no handler`);

	const target = await findActorOfAnyType(
		target_id,
		config.federation.webapp_url.hostname,
	);
	if (!target) throw new APError("Could not find target");

	await handler(activity, target);
});
