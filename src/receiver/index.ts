import { type Job, Worker } from "bullmq";
import { ApCache } from "../entity/apcache.js";
import { Channel } from "../entity/channel.js";
import { Guild } from "../entity/guild.js";
import { User } from "../entity/user.js";
import { APError } from "../util/activitypub/error.js";
import { AP_ACTIVITY } from "../util/activitypub/inbox/index.js";
import { ActivityHandlers } from "../util/activitypub/inbox/handlers/index.js";
import { config } from "../util/config.js";
import { initDatabase } from "../util/database.js";
import { initRabbitMQ } from "../util/events.js";
import { APActivity } from "@shootpub/activitypub-types/activity";

export type APInboundJobData = { activity: APActivity; target_id: string };

const jobHandler = async (job: Job<APInboundJobData>) => {
	const { activity, target_id } = job.data;

	console.log(`${new Date()} [${activity.type}] ${activity.id}`);

	activity["@context"] = undefined;

	const safe = AP_ACTIVITY.parse(activity);

	const [user, channel, guild] = await Promise.all([
		User.findOne({ where: { id: target_id } }),
		Channel.findOne({ where: { id: target_id } }),
		Guild.findOne({ where: { id: target_id } }),
	]);
	const target = user ?? channel ?? guild;
	if (!target) throw new APError("Could not find target");

	try {
		await ApCache.insert({
			id: safe.id,
			raw: safe,
		});
	} catch {
		throw new APError(`Activity with id ${safe.id} already processed`);
	}

	await ActivityHandlers[safe.type.toLowerCase() as Lowercase<string>](activity, target);
};

const worker = new Worker("inbound", jobHandler, {
	connection: {
		host: config().redis.host,
		port: config().redis.port,
	},
	autorun: false,
});

worker.on("failed", (job) => {
	console.warn(`${new Date()} Activity ${job?.data.activity.id} failed ${job?.failedReason}`);
});

worker.on("error", (e) => {
	if ("code" in e && e.code === "ECONNREFUSED")
		return console.error("Failed to connect to redis", e.message);

	console.error(e);
});

void (async () => {
	await initDatabase();
	await initRabbitMQ(false);

	if (!config().rabbitmq.enabled)
		console.error(
			"rabbitmq isn't configured. this worker won't be able to emit gateway events",
		);

	await worker.run();
})();
