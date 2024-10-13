import type { AnyAPObject } from "activitypub-types";
import { Router } from "express";
import { z } from "zod";
import {
	getOrFetchUser,
	resolveAPObject,
	resolveCollectionEntries,
	route,
} from "../../../../util";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({
				user_id: z.string(),
			}),
		},
		async (req, res) => {
			const { user_id } = req.params;

			const user = await getOrFetchUser(user_id);

			if (!user.collections?.outbox) return res.sendStatus(404);

			const entries = await Promise.all(
				(
					await resolveCollectionEntries(
						new URL(user.collections.outbox),
						5,
					)
				).map((x) => resolveAPObject<AnyAPObject>(x)),
			);

			return res.json(entries);
		},
	),
);

export default router;
