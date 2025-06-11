import type { APAccept, APFollow } from "activitypub-types";
import type { User } from "../../entity";
import { Relationship, RelationshipType } from "../../entity/relationship";
import { getExternalPathFromActor, sendActivity } from "../../sender";
import { addContext } from "../activitypub";
import { config } from "../config";
import { emitGatewayEvent } from "../events";
import { HttpError } from "../httperror";
import { makeInstanceUrl } from "../url";

export const acceptOrCreateRelationship = async (
	to: User,
	from: User,
	reference_object?: APFollow,
) => {
	// Check if there is a relationship in the other direction
	const existing = await Relationship.findOne({
		where: {
			from: { id: to.id },
			to: { id: from.id },
		},
		relations: { to: true, from: true },
	});

	if (existing && existing.from_state !== RelationshipType.blocked) {
		// Accept it
		existing.from_state = RelationshipType.accepted;
		existing.to_state = RelationshipType.accepted;
		await Relationship.update(
			{ id: existing.id },
			{ from_state: existing.from_state, to_state: existing.to_state },
		);

		// Send the gateway event to both clients

		if (
			to.collections?.inbox &&
			to.remote_address &&
			existing.reference_object
		) {
			const follow: APAccept = {
				type: "Accept",
				id: makeInstanceUrl(existing.id),
				actor: makeInstanceUrl(getExternalPathFromActor(from)),
				object: existing.reference_object.raw,
			};
			await sendActivity(from, addContext(follow), from);
		}

		return existing;
	}

	if (existing && existing.from_state === RelationshipType.blocked) {
		throw new HttpError("Object could not be found", 404);
	}

	// Otherwise create the relationship

	const relationship = await Relationship.create({
		from,
		to,
		from_state: RelationshipType.accepted,
		to_state: RelationshipType.pending,
		reference_object,
	}).save();

	// Send the gateway event to both
	emitGatewayEvent([to.id, from.id], {
		type: "RELATIONSHIP_CREATE",
		relationship: relationship.toClient(from.id),
	});

	if (to.collections?.inbox && to.remote_address) {
		const follow: APFollow = {
			type: "Follow",
			id: makeInstanceUrl(relationship.id),
			actor: makeInstanceUrl(getExternalPathFromActor(relationship.from)),
			object: to.remote_address,
		};
		await sendActivity(to, addContext(follow), from);
	}

	return relationship;
};
