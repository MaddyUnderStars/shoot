import { APFollow } from "activitypub-types";
import { User } from "../../entity";
import { Relationship, RelationshipType } from "../../entity/relationship";
import { getExternalPathFromActor, sendActivity } from "../../sender";
import { addContext } from "../activitypub";
import { config } from "../config";
import { emitGatewayEvent } from "../events";

export const AcceptOrCreateRelationship = async (to: User, from: User) => {
	// Check if there is a relationship in the other direction
	const existing = await Relationship.findOne({
		where: {
			from: { id: to.id },
			to: { id: from.id },
		},
		relations: { to: true, from: true },
	});

	if (existing) {
		// Accept it
		existing.type = RelationshipType.accepted;
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

	if (to.collections?.inbox && to.remote_address) {
		const follow: APFollow = {
			type: "Follow",
			id: `${config.federation.instance_url.origin}/${relationship.id}`,
			actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(relationship.from)}`,
			object: to.remote_address,
		};
		await sendActivity(
			new URL(to.collections.inbox),
			addContext(follow),
			from,
		);
	}

	return relationship;
};
