import type { APAccept } from "activitypub-types";
import { Channel } from "../../../../entity/channel";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import { config } from "../../../config";
import { getOrFetchUser } from "../../../entity/user";
import { PERMISSION } from "../../../permission";
import { makeInstanceUrl } from "../../../url";
import { generateMediaToken } from "../../../voice";
import { APError } from "../../error";
import { resolveId } from "../../resolve";
import { addContext } from "../../util";
import type { ActivityHandler } from ".";

export const JoinActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!(target instanceof Channel))
		throw new APError("Join at non-channel target is not supported");

	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor !== "string")
		throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!activity.object) throw new APError("What are you joining?");

	if (Array.isArray(activity.object))
		throw new APError("Cannot accept multiple objects");

	if (makeInstanceUrl(getExternalPathFromActor(target)) !== activity.object)
		throw new APError("Object and target mismatch?");

	const user = await getOrFetchUser(resolveId(activity.actor));

	await target.throwPermission(user, [
		PERMISSION.VIEW_CHANNEL,
		PERMISSION.CALL_CHANNEL,
	]);

	const token = await generateMediaToken(user.mention, target.id);

	const accept: APAccept = addContext({
		type: "Accept",
		result: token,
		target: config().webrtc.signal_address,
		actor: makeInstanceUrl(getExternalPathFromActor(target)),
		object: activity,
	});

	await sendActivity(user, accept, target);
};
