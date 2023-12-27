import { Router } from "express";
import { z } from "zod";
import { User } from "../../../../entity";
import { addContext, config, route } from "../../../../util";
import { makeOrderedCollection } from "../../../../util/activitypub/orderedCollection";
import { buildAPPerson } from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ user_id: z.string() }) }, async (req, res) => {
		const { user_id } = req.params;

		const user = await User.findOneOrFail({
			where: { name: user_id },
		});

		return res.json(addContext(buildAPPerson(user)));
	}),
);

router.post(
	"/inbox",
	route(
		{
			body: z.any(),
		},
		async (req, res) => {
			console.log(req.body);

			// TODO
			return res.sendStatus(200);
		},
	),
);

router.get(
	"/:collection",
	route(
		{
			params: z.object({
				user_id: z.string(),
				collection: z.union([
					z.literal("followers"),
					z.literal("following"),
					z.literal("outbox"),
				]),
			}),
			query: z.object({
				page: z.boolean().default(false).optional(),
				min_id: z.string().optional(),
				max_id: z.string().optional(),
			}),
		},
		async (req, res) => {
			const { user_id, collection } = req.params;

			const user = await User.findOneOrFail({
				where: { name: user_id },
			});

			return res.json(
				addContext(
					await makeOrderedCollection({
						id: `${config.federation.instance_url.origin}${req.originalUrl}`,
						page: req.query.page ?? false,
						min_id: req.query.min_id,
						max_id: req.query.max_id,
						getElements: async () => {
							return [];
						},
						getTotalElements: async () => {
							return 0;
						},
					}),
				),
			);
		},
	),
);

export default router;
