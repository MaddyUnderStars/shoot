import { APAccept } from "activitypub-types";
import { ActivityHandler } from ".";
import { Channel, User } from "../../../../entity";
import { RelationshipType } from "../../../../entity/relationship";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import { config } from "../../../config";
import { getOrFetchUser } from "../../../entity";
import { AcceptOrCreateRelationship } from "../../../entity/relationship";
import { APError } from "../../error";
import { addContext } from "../../util";

export const FollowActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	const from = activity.actor;
	if (typeof from != "string")
		throw new APError("Follow activity must have single actor");

	const actor = await getOrFetchUser(from);
	if (!actor.collections?.inbox)
		throw new APError("Received follow from actor without inbox");

	if (target instanceof User) {
		const relationship = await AcceptOrCreateRelationship(target, actor);
		if (relationship.type != RelationshipType.accepted) return;
	} else if (target instanceof Channel) {
		// TODO: check for an invite to this channel
	} else throw new APError("Cannot accept follows for this target");

	const accept: APAccept = addContext({
		type: "Accept",
		actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(target)}`,
		object: activity,
	});

	await sendActivity(new URL(actor.collections.inbox), accept, target);
};
