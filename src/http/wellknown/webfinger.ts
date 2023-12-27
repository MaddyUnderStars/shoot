import { Response, Router } from "express";
import z from "zod";
import { Channel, User } from "../../entity";
import { HttpError, config, splitQualifiedMention } from "../../util";
import { route } from "../../util/route";

const router = Router();

const WebfingerRequest = z.object({ resource: z.string() });

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

			const [user, channel] = await Promise.all([
				User.findOne({
					where: {
						name: mention.user,
						domain: config.federation.webapp_url.hostname,
					},
				}),
				// todo: awful
				parseInt(mention.user)
					? Channel.findOne({
							where: {
								id: mention.user,
								domain: config.federation.webapp_url.hostname,
							},
					  })
					: undefined,
			]);

			const actor = user ?? channel;

			if (!actor) throw new HttpError("Actor could not be found", 404);

			// TODO: don't hardcode 'user' in the response
			// TODO: check if guild/channel exists

			res.setHeader(
				"Content-Type",
				"application/jrd+json; charset=utf-8",
			);

			const id = actor instanceof User ? actor.name : actor.id;
			const path = actor instanceof User ? "/users/" : "/channel/";

			return res.json({
				subject: `acct:${id}@${actor.domain}`,
				aliases: [`${webapp_url.origin}${path}${actor.name}`],
				links: [
					{
						rel: "self",
						type: "application/activity+json",
						href: `${instance_url.origin}${path}${id}`,
					},
				],
			});
		},
	),
);

export default router;

interface WebfingerLink {
	rel: string;
	type?: string;
	href: string;
	template?: string;
}

export interface WebfingerResponse {
	subject: string;
	aliases: string[];
	links: WebfingerLink[];
}
