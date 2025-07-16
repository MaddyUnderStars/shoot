import { type APAccept, ActivityIsFollow } from "activitypub-types";
import { v7 as uuidv7 } from "uuid";
import type { ActivityHandler } from ".";
import { Channel } from "../../../../entity/channel";
import { Guild } from "../../../../entity/guild";
import { Invite } from "../../../../entity/invite";
import { RelationshipType } from "../../../../entity/relationship";
import { User } from "../../../../entity/user";
import { getExternalPathFromActor, sendActivity } from "../../../../sender";
import { joinGuild } from "../../../entity/guild";
import { acceptOrCreateRelationship } from "../../../entity/relationship";
import { getOrFetchUser } from "../../../entity/user";
import { makeInstanceUrl } from "../../../url";
import { APError } from "../../error";
import { resolveId } from "../../resolve";
import { addContext, splitQualifiedMention } from "../../util";

export const FollowActivityHandler: ActivityHandler = async (
	activity,
	target,
) => {
	if (!ActivityIsFollow(activity)) return;

	const from = activity.actor;
	if (typeof from !== "string")
		throw new APError("Follow activity must have single actor");

	const actor = await getOrFetchUser(resolveId(from));
	if (!actor.collections?.inbox)
		throw new APError("Received follow from actor without inbox");

	if (target instanceof User) {
		const rel = await acceptOrCreateRelationship(
			actor,
			target,
			false,
			activity,
		);

		if (rel.to_state !== RelationshipType.accepted) return;
	} else if (target instanceof Channel) {
		// TODO: check for an invite to this channel
		throw new APError("not implemented");
	} else if (target instanceof Guild) {
		const invite_code = activity.instrument;
		if (
			!invite_code ||
			Array.isArray(invite_code) ||
			typeof invite_code !== "string"
		)
			throw new APError(
				"Only one invite_code string value in instrument properly allowed",
			);

		const code = splitQualifiedMention(invite_code);

		const invite = await Invite.findOneOrFail({
			where: { code: code.user },
			relations: { guild: true },
		});

		await joinGuild(actor.mention, invite.guild.mention);
	} else throw new APError("Cannot accept follows for this target");

	const accept: APAccept = addContext({
		id: makeInstanceUrl(`${uuidv7()}/accept`),
		type: "Accept",
		actor: makeInstanceUrl(getExternalPathFromActor(target)),
		object: activity,
	});

	await sendActivity(actor, accept, target);
};
