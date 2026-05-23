import { Guild } from "../../../../entity/guild";
import { User } from "../../../../entity/user";
import { joinGuild } from "../../../entity/guild";
import { acceptRelationship } from "../../../entity/relationship";
import { findActorOfAnyType } from "../../../entity/resolve";
import { getOrFetchUser } from "../../../entity/user";
import { emitGatewayEvent } from "../../../events";
import { APError } from "../../error";
import { resolveId } from "../../resolve";
import { splitQualifiedMention } from "../../util";
import type { ActivityHandler } from ".";
import { config } from "../../../config";

const AcceptJoin: ActivityHandler = async (activity, target) => {
	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor !== "string") throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!(target instanceof User)) throw new APError("Cannot Accept<Join> at non-user");

	if (!activity.result) throw new APError("Media token not provided");
	if (typeof activity.result !== "string") throw new APError("unknown token format");

	if (!activity.target) throw new APError("Signal server ip not provided");
	if (typeof activity.target !== "string") throw new APError("unknown signal server ip format");

	const from = await getOrFetchUser(resolveId(activity.actor));

	emitGatewayEvent(
		from,
		{
			type: "MEDIA_TOKEN_RECEIVED",
			token: activity.result,
			endpoint: activity.target,
		},
		true,
	);
};

const AcceptFollow: ActivityHandler = async (activity, target) => {
	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor !== "string") throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!(target instanceof User)) throw new APError("Cannot Accept<Follow> at non-user");

	// getting an accept should only happen after we send something
	// so we should already have the actor responsible for accepting, probably

	const mention = splitQualifiedMention(activity.actor);
	const from = await findActorOfAnyType(mention.id, mention.domain);

	if (from instanceof User) {
		// A friend request was accepted
		await acceptRelationship(target, from);
	} else if (from instanceof Guild) {
		// A guild join request was accepted
		await joinGuild(target.mention, from.mention);
	} else {
		throw new APError("Don't know how to accept that");
	}
};

// TODO: Probably would be better to use zod for this or something
export const AcceptActivityHandler: ActivityHandler = async (activity, target) => {
	if (!activity.object) throw new APError("No object");

	if (Array.isArray(activity.object)) throw new APError("object is array");

	const inner = resolveId(activity.object);
	if (!(inner instanceof URL)) throw new APError("Unexpected type in object field");

	if (inner.hostname !== config().federation.instance_url.hostname) {
		throw new APError("Can't accept that");
	}

	// they are accepting an object we've created
	// this should just be a follow

	// TODO: actually verify that we sent an object with this ID before

	if (inner.pathname.includes("follow")) {
		await AcceptFollow(activity, target);
	} else if (inner.pathname.includes("voice")) {
		await AcceptJoin(activity, target);
	}
};
