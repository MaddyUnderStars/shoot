import { Router } from "express";
import { Not } from "typeorm";
import { z } from "zod";
import {
	PrivateRelationship,
	Relationship,
	RelationshipType,
} from "../../../../entity/relationship";
import { getOrFetchUser, route } from "../../../../util";
import { acceptOrCreateRelationship } from "../../../../util/entity/relationship";

const router = Router({ mergeParams: true });

router.get(
	"/",
	route(
		{
			params: z.object({ user_id: z.string() }),
			response: PrivateRelationship,
		},
		async (req, res) => {
			const { user_id } = req.params;

			const user = await getOrFetchUser(user_id);

			const relationship = await Relationship.findOneOrFail({
				where: [
					// We created this relationship
					{ to: { id: user.id }, from: { id: req.user.id } },
					// Or we are the target of one, and are not blocked
					{
						to: { id: req.user.id },
						from: { id: user.id },
						type: Not(RelationshipType.blocked),
					},
				],
				relations: {
					to: true,
					from: true,
				},
			});

			return res.json(relationship.toPrivate());
		},
	),
);

router.post(
	"/",
	route(
		{
			params: z.object({ user_id: z.string() }),
			body: z
				.object({
					type: z.union([z.literal("blocked"), z.literal("pending")]),
				})
				.optional(),
			response: PrivateRelationship,
		},
		async (req, res) => {
			const { user_id } = req.params;
			const to = await getOrFetchUser(user_id);
			const relationship = await acceptOrCreateRelationship(to, req.user);
			return res.json(relationship.toPrivate());
		},
	),
);

router.delete(
	"/",
	route(
		{
			params: z.object({ user_id: z.string() }),
		},
		async (req, res) => {
			const { user_id } = req.params;

			const to = await getOrFetchUser(user_id);

			await Relationship.delete({
				to: { id: to.id },
				from: { id: req.user.id },
			});
			await Relationship.delete({
				to: { id: req.user.id },
				from: { id: to.id },
			});

			// todo federate

			return res.sendStatus(200);
		},
	),
);

export default router;
