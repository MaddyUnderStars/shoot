import { ActivityIsFollow, type APAccept } from "activitypub-types";
import { v7 as uuidv7 } from "uuid";
import { Channel } from "../../../../entity/channel.js";
import { Guild } from "../../../../entity/guild.js";
import { Invite } from "../../../../entity/invite.js";
import { RelationshipType } from "../../../../entity/relationship.js";
import { User } from "../../../../entity/user.js";
import { getExternalPathFromActor, sendActivity } from "../../../../sender/index.js";
import { joinGuild } from "../../../entity/guild.js";
import { acceptOrCreateRelationship } from "../../../entity/relationship.js";
import { getOrFetchUser } from "../../../entity/user.js";
import { makeInstanceUrl } from "../../../url.js";
import { APError } from "../../error.js";
import { resolveId } from "../../resolve.js";
import { addContext, splitQualifiedMention } from "../../util.js";
import type { ActivityHandler } from "./index.js";
import { config } from "../../../config.js";

export const FollowActivityHandler: ActivityHandler = async (activity, target) => {
	if (!ActivityIsFollow(activity)) return;

	const from = activity.actor;
	if (typeof from !== "string") throw new APError("Follow activity must have single actor");

	const actor = await getOrFetchUser(resolveId(from));
	if (!actor.collections?.inbox) throw new APError("Received follow from actor without inbox");

	if (target instanceof User) {
		const rel = await acceptOrCreateRelationship(actor, target, false, activity);

		if (rel.to_state !== RelationshipType.accepted) return;
	} else if (target instanceof Channel) {
		// TODO: check for an invite to this channel
		throw new APError("not implemented");
	} else if (target instanceof Guild) {
		const invite_code = activity.instrument;
		if (!invite_code || Array.isArray(invite_code) || typeof invite_code !== "string")
			throw new APError("Only one invite_code string value in instrument properly allowed");

		const code = splitQualifiedMention(invite_code);

		if (code.domain !== config().federation.webapp_url.hostname)
			throw new APError("Shoot only supports InviteCodes from itself");

		const invite = await Invite.findOneOrFail({
			where: { code: code.id },
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
