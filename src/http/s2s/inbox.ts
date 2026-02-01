import { Router } from "express";
import { z } from "zod";
import { APError } from "../../util/activitypub/error";
import { handleInbox } from "../../util/activitypub/inbox";
import {
	hasAPContext,
	splitQualifiedMention,
} from "../../util/activitypub/util";
import { config } from "../../util/config";
import { findActorOfAnyType } from "../../util/entity/resolve";
import { route } from "../../util/route";

const router = Router();

router.post(
	"/",
	route(
		{
			body: z.any(),
		},
		async (req, res) => {
			// TODO: addressed to multiple actors
			if (!hasAPContext(req.body))
				throw new APError("Doesn't have context");

			const activity = req.body;
			// TODO: multiple addressing
			// TODO: `to` field isn't always used in activities
			// (sometimes it's `object` or whatever). So should do that
			// Maybe have some sort of switch for which fields to use with each activity type
			const to = Array.isArray(activity.to)
				? activity.to[0]
				: activity.to;

			if (typeof to !== "string")
				throw new APError("Don't know how to resolve to field");
			const mention = splitQualifiedMention(to);
			if (mention.domain !== config().federation.webapp_url.hostname)
				throw new APError("Not addressed to a user we control");

			const actor = await findActorOfAnyType(
				mention.id,
				config().federation.webapp_url.hostname,
			);
			if (!actor)
				throw new APError(
					"Activity is addressed to actor we don't have",
				);

			await handleInbox(activity, actor);
			return res.sendStatus(200);
		},
	),
);

export default router;
