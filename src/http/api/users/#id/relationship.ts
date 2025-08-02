import { Router } from "express";
import { z } from "zod";
import {
	PrivateRelationship,
	Relationship,
} from "../../../../entity/relationship";
import type { User } from "../../../../entity/user";
import { ActorMention } from "../../../../util/activitypub/constants";
import {
	acceptOrCreateRelationship,
	fetchRelationship,
} from "../../../../util/entity/relationship";
import { getOrFetchUser } from "../../../../util/entity/user";
import { emitGatewayEvent } from "../../../../util/events";
import { route } from "../../../../util/route";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({ user_id: ActorMention }),
			response: PrivateRelationship,
		},
		async (req, res) => {
			const { user_id } = req.params;

			const user = await getOrFetchUser(user_id);

			const relationship = await fetchRelationship(user.id, req.user.id);

			return res.json(relationship.toClient(req.user.id));
		},
	),
);

router.post(
	"/",
	route(
		{
			params: z.object({ user_id: ActorMention }),
			body: z
				.object({
					type: z
						.union([z.literal("blocked"), z.literal("pending")])
						.optional(),
				})
				.optional(),
			response: PrivateRelationship,
		},
		async (req, res) => {
			const { user_id } = req.params;

			// TODO: block

			let to: User;
			try {
				to = await getOrFetchUser(user_id);
			} catch (_) {
				throw new Error("Could not find that user");
			}

			const rel = await acceptOrCreateRelationship(
				req.user,
				to,
				req.body?.type === "blocked",
			);

			return res.json(rel.toClient(req.user.id));
		},
	),
);

router.delete(
	"/",
	route(
		{
			params: z.object({ user_id: ActorMention }),
		},
		async (req, res) => {
			const { user_id } = req.params;

			const to = await getOrFetchUser(user_id);

			// TODO: can't you delete multiple in a single statement? hm
			await Promise.all([
				Relationship.delete({
					to: { id: to.id },
					from: { id: req.user.id },
				}),
				Relationship.delete({
					to: { id: req.user.id },
					from: { id: to.id },
				}),
			]);

			// tell both parties that we've deleted the relationship
			// can't do it in one call, unfortunately. without some hackery of course
			emitGatewayEvent(req.user, {
				type: "RELATIONSHIP_DELETE",
				user: to.mention,
			});

			emitGatewayEvent(to, {
				type: "RELATIONSHIP_DELETE",
				user: req.user.mention,
			});

			// todo federate

			return res.sendStatus(200);
		},
	),
);

export default router;
