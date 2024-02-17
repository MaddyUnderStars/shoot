import { User } from "../../entity";
import { Relationship, RelationshipType } from "../../entity/relationship";
import { emitGatewayEvent } from "../events";

export const AcceptOrCreateRelationship = async (to: User, from: User) => {
	// Check if there is a relationship in the other direction
	const existing = await Relationship.findOne({
		where: {
			from: { id: to.id },
			to: { id: from.id },
		},
	});

	if (existing) {
		// Accept it
		existing.type = RelationshipType.pending;
		await Relationship.update({ id: existing.id }, { type: existing.type });

		// Send the gateway event to both clients

		return existing;
	}

	// TODO: check if blocked

	// Otherwise create the relationship

	const relationship = await Relationship.create({
		from,
		to,
		type: RelationshipType.pending,
	}).save();

	// Send the gateway event to both
	emitGatewayEvent([to.id, from.id], {
		type: "RELATIONSHIP_CREATE",
		relationship: relationship,
	});

	return relationship;
};
