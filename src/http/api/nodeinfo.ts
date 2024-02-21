import { Router } from "express";
import { z } from "zod";
import { HttpError, config } from "../../util";
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
	openRegistrations: z.boolean(),
	metadata: z.object({}),
});

router.get(
	"/",
	route(
		{
			response: NodeInfoResponse,
		},
		async (req, res) => {
			if (!config.federation.enabled)
				throw new HttpError("Federation is disabled", 400);

			const host = config.federation.instance_url;

			return res.json({
				version: "2.0",
				software: {
					name: "Shoot",
					version: "0.0",
					homepage: "https://github.com/MaddyUnderStars/shoot",
				},
				protocols: ["activitypub"],
				// usage: {
				// 	users: {
				// 		total: 11,
				// 		activeMonth: 193,
				// 		activeHalfyear: 1224,
				// 	},
				// 	localPosts: 14,
				// },
				openRegistrations: false,
				metadata: {},
			});
		},
	),
);

export default router;
