import { Response, Router } from "express";
import z from "zod";
import { User } from "../../entity";
import { getExternalPathFromActor } from "../../sender";
import {
	HttpError,
	InstanceActor,
	config,
	findActorOfAnyType,
	route,
	splitQualifiedMention,
} from "../../util";
import { WebfingerResponse } from "../../util/activitypub/constants";

const router = Router();

const WebfingerRequest = z.object({ resource: z.string() });

// const uuid =
// /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get(
	"/webfinger",
	route(
		{ query: WebfingerRequest },
		async (req, res: Response<WebfingerResponse>) => {
			if (!config.federation.enabled)
				throw new HttpError("Federation is disabled", 400);

			let { resource } = req.query;
			resource = resource.replace("acct:", "");

			const { webapp_url, instance_url } = config.federation;

			const mention = splitQualifiedMention(resource);
			if (
				mention.domain != webapp_url.hostname &&
				mention.domain != instance_url.hostname
			)
				throw new HttpError("Resource not found", 404);

			const actor = await findActorOfAnyType(
				mention.user,
				config.federation.webapp_url.hostname,
			);

			if (!actor) throw new HttpError("Actor could not be found", 404);

			res.setHeader(
				"Content-Type",
				"application/jrd+json; charset=utf-8",
			);

			// this is really, really gross. TODO: fix
			const id =
				actor instanceof User || actor.id == InstanceActor.id
					? actor.name
					: actor.id;
			const path = getExternalPathFromActor(actor);

			return res.json({
				subject: `acct:${id}@${actor.domain}`,
				aliases: [`${webapp_url.origin}${path}`],
				links: [
					{
						rel: "self",
						type: "application/activity+json",
						href: `${instance_url.origin}${path}`,
					},
				],
			});
		},
	),
);

export default router;
