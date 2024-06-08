import { APActivity } from "activitypub-types";
import { z } from "zod";
import { ActivityHandler } from ".";
import { Channel } from "../../../../entity";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import { config } from "../../../config";
import { getOrFetchUser } from "../../../entity";
import { PERMISSION } from "../../../permission";
import { APError } from "../../error";
import { splitQualifiedMention } from "../../util";

const UpdateActivity = z.object({
	type: z.union([z.literal("Update"), z.literal("update")]),
	id: z.string(),
	actor: z.string(),
	to: z.string(),
	object: z
		.object({
			type: z.union([z.literal("Group"), z.literal("group")]),
			id: z.string(),

			name: z.string(),
		})
		.passthrough(),
});

export type APAcknowledge = APActivity & { type: "Acknowledge" };

export const UpdateActivityHandler: ActivityHandler = async (data, target) => {
	if (!(target instanceof Channel))
		throw new APError("Can only Update at Channel");

	const activity = UpdateActivity.parse(data);

	const mention = splitQualifiedMention(activity.object.id);
	if (mention.user != target.id && mention.domain != target.domain)
		throw new APError("Inner object does not match target");

	const actor = await getOrFetchUser(activity.actor);

	target.throwPermission(actor, PERMISSION.MANAGE_CHANNELS);

	await Channel.update({ id: target.id }, { name: activity.object.name });

	await sendActivity(
		actor,
		{
			type: "Acknowledge",
			actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(target)}`,
			attributedTo: activity.id,
		} as APAcknowledge,
		target,
	);
};
