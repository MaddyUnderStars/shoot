import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

import type { APActivity } from "activitypub-types";
import { type Job, Worker } from "bullmq";
import { ApCache } from "../entity/apcache";
import { Channel } from "../entity/channel";
import { Guild } from "../entity/guild";
import { User } from "../entity/user";
import { APError } from "../util/activitypub/error";
import { AP_ACTIVITY } from "../util/activitypub/inbox";
import { ActivityHandlers } from "../util/activitypub/inbox/handlers";
import { config } from "../util/config";
import { initDatabase } from "../util/database";
import { initRabbitMQ } from "../util/events";

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
	} catch (_) {
		throw new APError(`Activity with id ${safe.id} already processed`);
	}

	await ActivityHandlers[safe.type.toLowerCase() as Lowercase<string>](
		activity,
		target,
	);
};

const worker = new Worker("inbound", jobHandler, {
	connection: {
		host: config().redis.host,
		port: config().redis.port,
	},
	autorun: false,
});

worker.on("failed", (job) => {
	console.warn(
		`${new Date()} Activity ${job?.data.activity.id} failed ${job?.failedReason}`,
	);
});

worker.on("error", (e) => {
	if ("code" in e && e.code === "ECONNREFUSED")
		return console.error("Failed to connect to redis", e.message);

	console.error(e);
});

(async () => {
	await initDatabase();
	await initRabbitMQ(false);

	if (!config().rabbitmq.enabled)
		console.error(
			"rabbitmq isn't configured. this worker won't be able to emit gateway events",
		);

	await worker.run();
})();
