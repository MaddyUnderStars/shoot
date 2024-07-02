import { ActivityIsFollow, ActivityIsJoin } from "activitypub-types";
import type { ActivityHandler } from ".";
import { User } from "../../../../entity";
import { getOrFetchUser } from "../../../entity";
import { acceptOrCreateRelationship } from "../../../entity/relationship";
import { emitGatewayEvent } from "../../../events";
import { APError } from "../../error";
import { resolveAPObject } from "../../resolve";

// TODO: Accept<Join>

const AcceptJoin: ActivityHandler = async (activity, target) => {
	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor !== "string")
		throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!(target instanceof User))
		throw new APError("Cannot Accept<Join> at non-user");

	if (!activity.result) throw new APError("Media token not provided");
	if (typeof activity.result !== "string")
		throw new APError("unknown token format");

	if (!activity.target) throw new APError("Signal server ip not provided");
	if (typeof activity.target !== "string")
		throw new APError("unknown signal server ip format");

	const from = await getOrFetchUser(activity.actor);

	emitGatewayEvent(from.id, {
		type: "MEDIA_TOKEN_RECEIVED",
		token: activity.result,
		endpoint: activity.target,
	});
};

const AcceptFollow: ActivityHandler = async (activity, target) => {
	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor !== "string")
		throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!(target instanceof User))
		throw new APError("Cannot Accept<Follow> at non-user");

	const from = await getOrFetchUser(activity.actor);

	const relationship = await acceptOrCreateRelationship(target, from);
};

// TODO: Probably would be better to use zod for this or something
export const AcceptActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!activity.object) throw new APError("No object");

	if (Array.isArray(activity.object)) throw new APError("object is array");

	const inner = await resolveAPObject(activity.object);

	activity.object = inner;

	if (ActivityIsFollow(activity.object)) await AcceptFollow(activity, target);
	else if (ActivityIsJoin(activity.object))
		await AcceptJoin(activity, target);
};
