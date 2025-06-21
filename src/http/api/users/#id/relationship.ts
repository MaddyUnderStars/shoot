import { Router } from "express";
import { Not } from "typeorm";
import { z } from "zod";
import type { User } from "../../../../entity";
import {
	PrivateRelationship,
	Relationship,
	RelationshipType,
} from "../../../../entity/relationship";
import { emitGatewayEvent, getOrFetchUser, route } from "../../../../util";
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
						from_state: Not(RelationshipType.blocked),
					},
				],
				relations: {
					to: true,
					from: true,
				},
			});

			return res.json(relationship.toClient(req.user.id));
		},
	),
);

router.post(
	"/",
	route(
		{
			params: z.object({ user_id: z.string() }),
			body: z.object({
				type: z
					.union([z.literal("blocked"), z.literal("pending")])
					.optional(),
			}),
			response: PrivateRelationship,
		},
		async (req, res) => {
			const { user_id } = req.params;

			// TODO: block

			let to: User;
			try {
				to = await getOrFetchUser(user_id);
			} catch (e) {
				throw new Error("Could not find that user");
			}

			const relationship = await acceptOrCreateRelationship(to, req.user);
			return res.json(relationship.toClient(req.user.id));
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

			// tell both parties that we've deleted the relationship
			// can't do it in one call, unfortunately. without some hackery of course
			emitGatewayEvent(req.user.id, {
				type: "RELATIONSHIP_DELETE",
				user_id: to.id,
			});

			emitGatewayEvent(to.id, {
				type: "RELATIONSHIP_DELETE",
				user_id: req.user.id,
			});

			// todo federate

			return res.sendStatus(200);
		},
	),
);

export default router;
