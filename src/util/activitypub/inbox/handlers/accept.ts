import { ActivityIsFollow, ActivityIsJoin } from "activitypub-types";
import type { ActivityHandler } from ".";
import { Guild } from "../../../../entity/guild";
import { User } from "../../../../entity/user";
import { joinGuild } from "../../../entity/guild";
import { acceptRelationship } from "../../../entity/relationship";
import { findActorOfAnyType } from "../../../entity/resolve";
import { getOrFetchUser } from "../../../entity/user";
import { emitGatewayEvent } from "../../../events";
import { APError } from "../../error";
import { resolveAPObject, resolveId, resolveUrlOrObject } from "../../resolve";
import { splitQualifiedMention } from "../../util";

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

	const from = await getOrFetchUser(resolveId(activity.actor));

	emitGatewayEvent(from, {
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

	// getting an accept should only happen after we send something
	// so we should already have the actor responsible for accepting, probably

	const mention = splitQualifiedMention(activity.actor);
	const from = await findActorOfAnyType(mention.user, mention.domain);

	if (from instanceof User) {
		// A friend request was accepted
		const relationship = await acceptRelationship(target, from);
	} else if (from instanceof Guild) {
		// A guild join request was accepted
		await joinGuild(target.mention, from.mention);
	} else {
		throw new APError("Don't know how to accept that");
	}
};

// TODO: Probably would be better to use zod for this or something
export const AcceptActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!activity.object) throw new APError("No object");

	if (Array.isArray(activity.object)) throw new APError("object is array");

	const inner = await resolveAPObject(resolveUrlOrObject(activity.object));

	activity.object = inner;

	if (ActivityIsFollow(activity.object)) await AcceptFollow(activity, target);
	else if (ActivityIsJoin(activity.object))
		await AcceptJoin(activity, target);
};
