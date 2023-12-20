import { Response, Router } from "express";
import z from "zod";
import { User } from "../../entity";
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
			if (mention.domain != webapp_url.hostname && mention.domain != instance_url.hostname)
				throw new HttpError("Resource not found", 404);

			const user = await User.findOneOrFail({
				where: {
					username: mention.user,
					domain: config.federation.webapp_url.hostname,
				},
			});

			// TODO: don't hardcode 'user' in the response
			// TODO: check if guild/channel exists

			res.setHeader("Content-Type", "application/jrd+json; charset=utf-8");
			return res.json({
				subject: `acct:${user.username}@${user.domain}`,
				aliases: [`${webapp_url.origin}/user/${user.username}`],
				links: [
					{
						rel: "self",
						type: "application/activity+json",
						href: `${instance_url.origin}/users/${user.username}`,
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
