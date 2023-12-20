import { APPerson } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import { User } from "../../entity";
import { addContext, config, route } from "../../util";
import { makeOrderedCollection } from "../../util/activitypub/orderedCollection";

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

router.get(
	"/users/:user_id/outbox",
	route(
		{
			query: z.object({
				page: z.boolean({ coerce: true }).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			return res.json(
				await makeOrderedCollection({
					page: req.query.page ?? false,
					min_id: req.query.min_id,
					max_id: req.query.max_id,
					id: `${config.federation.instance_url.origin}${req.originalUrl}`,
					getElements: async () => {
						return [];
					},
					getTotalElements: async () => 0,
				}),
			);
		},
	),
);

router.get(
	"/users/:user_id/followers",
	route(
		{
			query: z.object({
				page: z.boolean({ coerce: true }).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			return res.json(
				await makeOrderedCollection({
					page: req.query.page ?? false,
					min_id: req.query.min_id,
					max_id: req.query.max_id,
					id: `${config.federation.instance_url.origin}${req.originalUrl}`,
					getElements: async () => {
						return [];
					},
					getTotalElements: async () => 0,
				}),
			);
		},
	),
);

export default router;
