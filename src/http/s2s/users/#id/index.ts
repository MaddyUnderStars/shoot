import { Router } from "express";
import { z } from "zod";
import { Relationship, User } from "../../../../entity";
import {
	addContext,
	config,
	getDatabase,
	makeInstanceUrl,
	orderedCollectionHandler,
	route,
} from "../../../../util";
import { handleInbox } from "../../../../util/activitypub/inbox";
import { buildAPActor } from "../../../../util/activitypub/transformers";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route({ params: z.object({ user_id: z.string() }) }, async (req, res) => {
		const { user_id } = req.params;

		const user = await User.findOneOrFail({
			where: {
				name: user_id,
				domain: config.federation.webapp_url.hostname,
			},
		});

		return res.json(addContext(buildAPActor(user)));
	}),
);

router.post(
	"/inbox",
	route(
		{
			body: z.any(),
			params: z.object({ user_id: z.string() }),
		},
		async (req, res) => {
			const target = await User.findOneOrFail({
				where: { name: req.params.user_id },
			});

			await handleInbox(req.body, target);
			return res.sendStatus(200);
		},
	),
);

const COLLECTION_PARAMS = {
	params: z.object({
		user_id: z.string(),
	}),
	query: z.object({
		before: z.string().optional(),
		after: z.string().optional(),
	}),
};

router.get(
	"/followers",
	route(COLLECTION_PARAMS, async (req, res) =>
		res.json(
			await orderedCollectionHandler({
				id: makeInstanceUrl(`/users/${req.params.user_id}/followers`),
				...req.query,
				convert: (x) => x.from.remote_address ?? buildAPActor(x.from),
				entity: Relationship,
				qb: getDatabase()
					.getRepository(Relationship)
					.createQueryBuilder("relationship")
					.leftJoinAndSelect("relationship.from", "from")
					.leftJoin("relationship.to", "to")
					.where("to.name = :name", {
						name: req.params.user_id,
					})
					.andWhere("to.domain = :domain", {
						domain: config.federation.webapp_url.hostname,
					}),
			}),
		),
	),
);

// TODO: outbox, followers

export default router;
