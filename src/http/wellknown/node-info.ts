import { Router } from "express";
import { HttpError, config } from "../../util";
import { route } from "../../util/route";

const router = Router();

router.get(
	"/node-info/2.0",
	route({}, async (req, res) => {
		if (!config.federation.enabled)
			throw new HttpError("Federation is disabled", 400);

		const host = config.federation.instance_url;

		return res.json({
			version: "2.0",
			software: {
				name: "Unnamed AP instant messenger",
				version: "0.1",
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
