import { type Response, Router } from "express";
import z from "zod";
import { Invite, User } from "../../entity";
import { getExternalPathFromActor } from "../../sender";
import {
	HttpError,
	InstanceActor,
	config,
	findActorOfAnyType,
	route,
	splitQualifiedMention,
} from "../../util";
import type { WebfingerResponse } from "../../util/activitypub/constants";

const router = Router();

const WebfingerRequest = z.object({ resource: z.string() });

// TODO: this is pretty gross.
// if invites were actors it would be easier, because I could just reuse the all the existing actor functions
// but then, invites would be actors, and that's stupid!

const webfingerLookupAcct = async (lookup: string) => {
	const actor = await findActorOfAnyType(
		lookup,
		config.federation.webapp_url.hostname,
	);

	if (!actor) throw new HttpError("Actor could not be found", 404);

	// this is really, really gross. TODO: fix
	const id =
		actor instanceof User || actor.id === InstanceActor.id
			? actor.name
			: actor.id;
	const path = getExternalPathFromActor(actor);

	return {
		path,
		id,
	};
};

const webfingerLookupInvite = async (lookup: string) => {
	const invite = await Invite.findOneOrFail({
		where: {
			code: lookup,
		},
	});

	return {
		path: `/invite/${invite.code}`,
		id: invite.code,
	};
};

router.get(
	"/webfinger",
	route(
		{ query: WebfingerRequest },
		async (req, res: Response<WebfingerResponse>) => {
			if (!config.federation.enabled)
				throw new HttpError("Federation is disabled", 400);

			let resource = req.query.resource;

			const type =
				resource.indexOf(":") === -1 ? "acct" : resource.split(":")[0];
			resource = resource.replace(`${type}:`, "");

			const { webapp_url, instance_url } = config.federation;

			const mention = splitQualifiedMention(resource);
			if (
				mention.domain !== webapp_url.hostname &&
				mention.domain !== instance_url.hostname
			)
				throw new HttpError("Resource not found", 404);

			res.setHeader(
				"Content-Type",
				"application/jrd+json; charset=utf-8",
			);

			const handlers = {
				acct: webfingerLookupAcct,
				invite: webfingerLookupInvite,
			} as Record<
				string,
				(lookup: string) => Promise<{ id: string; path: string }>
			>;

			const { id, path } = await handlers[type](mention.user);

			return res.json({
				subject: `${type}:${id}@${config.federation.webapp_url.hostname}`,
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
