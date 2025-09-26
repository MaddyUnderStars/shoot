import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { config } from "../util/config";

extendZodWithOpenApi(z);

import { type Job, Worker } from "bullmq";
import webPush from "web-push";
import { PushSubscription } from "../entity/pushSubscription";
import type { ActorMention } from "../util/activitypub/constants";
import { splitQualifiedMention } from "../util/activitypub/util";
import { initDatabase } from "../util/database";
import { getOrFetchUser } from "../util/entity/user";

webPush.setVapidDetails(
	config.federation.instance_url.origin,
	config.notifications.publicKey,
	config.notifications.privateKey,
);

export type PushNotificationJobData = {
	user: ActorMention;
	notification: {
		title: string;
		body: string;
		sent: number; // timestamp of when notification sent
		image?: string; // url of image to display
	};
};

const jobHandler = async (job: Job<PushNotificationJobData>) => {
	console.log(`${new Date()} ${job.data.user}`);

	if (
		splitQualifiedMention(job.data.user).domain !==
		config.federation.webapp_url.hostname
	)
		return;

	const user = await getOrFetchUser(job.data.user);

	const subscriptions = await PushSubscription.find({
		where: {
			userId: user.id,
		},
	});

	for (const sub of subscriptions) {
		try {
			const res = await webPush.sendNotification(
				sub.asStandard(),
				JSON.stringify(job.data.notification),
			);

			console.log(res);
		} catch (e) {
			await sub.remove();
		}
	}
};

const worker = new Worker("notifications", jobHandler, {
	connection: {
		host: config.redis.host,
		port: config.redis.port,
	},
	autorun: false,
});

worker.on("ready", () => {
	console.log("ready");
});

worker.on("failed", (job) => {
	console.warn(`${new Date()} Push notification failed ${job?.failedReason}`);
});

worker.on("error", (e) => {
	if ("code" in e && e.code === "ECONNREFUSED")
		return console.error("Failed to connect to redis", e.message);

	console.error(e);
});

(async () => {
	await initDatabase();

	await worker.run();
})();
