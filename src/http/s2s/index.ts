import { APPerson } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { User } from "../../entity";
import { addContext, config, route } from "../../util";

const router = Router();

router.get(
	"/users/:user_id",
	route({ params: z.object({ user_id: z.string() }) }, async (req, res) => {
		const { user_id } = req.params;

		const user = await User.findOneOrFail({
			where: {
				username: user_id,
			},
		});

		const me = `${config.federation.instance_url.origin}/users/${user.username}`;

		res.setHeader(
			"Content-Type",
			"application/activity+json; charset=utf-8",
		);

		return res.json(
			addContext({
				type: "Person",
				id: me,
				url: `${config.federation.webapp_url.origin}/users/${user.username}`,
				preferredUsername: user.username,
				name: user.display_name,
				inbox: `${me}/inbox`,
				outbox: `${me}/outbox`,
				followers: `${me}/followers`,
				publicKey: {
					id: `${me}#public-key`,
					owner: me,
					publicKeyPem: user.public_key,
				},
			} as APPerson),
		);
	}),
);

router.post("/users/:user_id/inbox", (req, res) => {
	console.log("yay", req.body);
});

export default router;
