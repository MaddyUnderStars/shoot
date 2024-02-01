import { Router } from "express";
import { HttpError, config } from "../../util";
import { route } from "../../util/route";

const router = Router();

router.get(
	"/",
	route({}, async (req, res) => {
		if (!config.federation.enabled)
			throw new HttpError("Federation is disabled", 400);

		const host = config.federation.instance_url;

		return res.json({
			version: "2.0",
			software: {
				name: "Shoot",
				version: "0.0",
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
	}),
);

export default router;
