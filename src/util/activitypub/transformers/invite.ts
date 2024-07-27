import type { APObject } from "activitypub-types";
import type { Invite } from "../../../entity";
import { config } from "../../config";
import { buildAPActor } from "./actor";

export type APGuildInvite = APObject & { type: "GuildInvite" };

export const buildAPGuildInvite = (invite: Invite): APGuildInvite => {
	return {
		type: "GuildInvite",
		id: `${config.federation.instance_url.origin}/invite/${invite.code}`,
		attributedTo: buildAPActor(invite.guild),
	};
};
