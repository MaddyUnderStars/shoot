import { Router } from "express";
import { z } from "zod";
import { config } from "../../util/config";
import { HttpError } from "../../util/httperror";
import { route } from "../../util/route";

const router = Router();

const NodeInfoResponse = z.object({
	version: z.string(),
	software: z.object({
		name: z.string(),
		version: z.string(),
		homepage: z.string(),
	}),
	protocols: z.array(z.string()),
	services: z.object({
		outbound: z.array(z.string()),
		inbound: z.array(z.string()),
	}),
	usage: z
		.object({
			users: z.object({
				total: z.number(),
				activeMonth: z.number().optional(),
				activeHalfyear: z.number().optional(),
			}),
			localPosts: z.number().optional(),
			localComments: z.number().optional(),
		})
		.optional(),
	openRegistrations: z.boolean(),
	metadata: z.object({}).optional(),
});

const DiscoverResponse = z.object({
	links: z.array(
		z.object({
			rel: z.string(),
			href: z.string(),
		}),
	),
});

router.get(
	"/",
	route(
		{
			response: DiscoverResponse,
		},
		async (req, res) => {
			if (!config().federation.enabled)
				throw new HttpError("Federation is disabled", 400);

			const host = config().federation.instance_url.origin;

			res.json({
				links: [
					{
						rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
						href: `${host}${req.originalUrl}/2.0`,
					},
				],
			});
		},
	),
);

router.get(
	"/2.0",
	route(
		{
			response: NodeInfoResponse,
		},
		(_req, res) => {
			res.json({
				version: "2.0",
				software: {
					name: "shoot",
					version: "1.0.0",
					homepage: "https://github.com/MaddyUnderStars/shoot",
				},
				protocols: ["activitypub"],
				services: {
					outbound: [],
					inbound: [],
				},
				// usage: {
				//     users: {
				//         total: 0,
				//         activeMonth: 0,
				//         activeHalfyear: 0,
				//     },
				//     localPosts: 0,
				//     localComments: 0,
				// },
				openRegistrations: config().registration.enabled,
				metadata: {
					// Not sure I'm happy putting this here...
					webPushPublicKey: config().notifications.enabled
						? config().notifications.publicKey
						: null,
				},
			});
		},
	),
);

export default router;
