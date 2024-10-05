import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
extendZodWithOpenApi(z);

import type { APActivity } from "activitypub-types";
import { type Job, Worker } from "bullmq";
import { ApCache, Channel, Guild, User } from "../entity";
import { APError, AP_ACTIVITY, initDatabase } from "../util";
import { ActivityHandlers } from "../util/activitypub/inbox/handlers";

export type APInboundJobData = { activity: APActivity; target_id: string };

const jobHandler = async (job: Job<APInboundJobData>) => {
	const { activity, target_id } = job.data;

	console.log(`${new Date()} [${activity.type}] ${activity.id}`);

	activity["@context"] = undefined;

	const safe = AP_ACTIVITY.parse(activity);

	const [user, channel, guild] = await Promise.all([
		await User.findOne({ where: { id: target_id } }),
		await Channel.findOne({ where: { id: target_id } }),
		await Guild.findOne({ where: { id: target_id } }),
	]);
	const target = user ?? channel ?? guild;
	if (!target) throw new APError("Could not find target");

	try {
		await ApCache.insert({
			id: safe.id,
			raw: safe,
		});
	} catch (e) {
		throw new APError(`Activity with id ${safe.id} already processed`);
	}

	await ActivityHandlers[safe.type.toLowerCase() as Lowercase<string>](
		activity,
		target,
	);
};

const worker = new Worker("inbound", jobHandler, {
	connection: {
		host: "localhost",
		port: 6379,
	},
	autorun: false,
});

worker.on("failed", (job) => {
	console.warn(
		`${new Date()} Activity ${job?.data.activity.id} failed ${job?.failedReason}`,
	);
});

worker.on("error", (e) => {
	console.error(e);
});

initDatabase().then(() => worker.run());
