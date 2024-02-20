import { ActivityIsFollow } from "activitypub-types";
import { ActivityHandler } from ".";
import { User } from "../../../../entity";
import { getOrFetchUser } from "../../../entity";
import { acceptOrCreateRelationship } from "../../../entity/relationship";
import { APError } from "../../error";
import { resolveAPObject } from "../../resolve";

// TODO: PRobably would be better to use zod for this or something
export const AcceptActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!(target instanceof User))
		throw new APError("TODO: implement Accept Follow channel");

	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor != "string")
		throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!activity.object) throw new APError("What are you accepting?");

	if (Array.isArray(activity.object))
		throw new APError("Cannot accept multiple objects");

	const inner = await resolveAPObject(activity.object);

	if (!ActivityIsFollow(inner))
		throw new APError(`Don't know how to Accept '${inner.type}`);

	const from = await getOrFetchUser(activity.actor);

	const relationship = await acceptOrCreateRelationship(target, from);
};
