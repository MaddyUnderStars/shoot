import { APAccept } from "@shootpub/activitypub-types/activities/accept";
import { Channel } from "../../../../entity/channel.js";
import { getExternalPathFromActor, sendActivity } from "../../../../sender/index.js";
import { config } from "../../../config.js";
import { getOrFetchUser } from "../../../entity/user.js";
import { PERMISSION } from "../../../permission.js";
import { makeInstanceUrl } from "../../../url.js";
import { generateMediaToken } from "../../../voice.js";
import { APError } from "../../error.js";
import { resolveId } from "../../resolve.js";
import { addContext } from "../../util.js";
import type { ActivityHandler } from "./index.js";
import { v7 as uuid } from "uuid";

export const JoinActivityHandler: ActivityHandler = async (activity, target) => {
	if (!(target instanceof Channel))
		throw new APError("Join at non-channel target is not supported");

	if (!activity.actor) throw new APError("Who is actor?");

	if (typeof activity.actor !== "string") throw new APError("Actor must be string");

	if (Array.isArray(activity.actor))
		throw new APError("Don't know how to handle multiple `actor`s");

	if (!activity.object) throw new APError("What are you joining?");

	if (Array.isArray(activity.object)) throw new APError("Cannot accept multiple objects");

	if (makeInstanceUrl(getExternalPathFromActor(target)) !== activity.object)
		throw new APError("Object and target mismatch?");

	const user = await getOrFetchUser(resolveId(activity.actor));

	await target.throwPermission(user, [PERMISSION.VIEW_CHANNEL, PERMISSION.CALL_CHANNEL]);

	const token = await generateMediaToken(user.mention, target.id);

	const accept: APAccept = addContext({
		type: "Accept",
		id: makeInstanceUrl(uuid()),
		result: token,
		target: config().webrtc.signal_address,
		actor: makeInstanceUrl(getExternalPathFromActor(target)),
		object: activity,
	});

	await sendActivity(user, accept, target);
};
