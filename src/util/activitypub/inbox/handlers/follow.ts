import { APReject } from "activitypub-types";
import { ActivityHandler } from ".";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import { config } from "../../../config";
import { getOrFetchUser } from "../../../entity";
import { APError } from "../../error";
import { addContext } from "../../util";

export const FollowActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	const to = activity.actor;
	if (typeof to != "string")
		throw new APError("Follow activity must have single actor");

	const actor = await getOrFetchUser(to);
	if (!actor.collections?.inbox)
		throw new APError("Received follow from actor without inbox");

	// TODO

	const accept: APReject = addContext({
		type: "Reject",
		actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(target)}`,
		object: activity,
	})

	await sendActivity(new URL(actor.collections.inbox), accept, target);
};
