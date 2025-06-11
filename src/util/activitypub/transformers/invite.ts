import type { APObject } from "activitypub-types";
import type { Invite } from "../../../entity";
import { config } from "../../config";
import { buildAPActor } from "./actor";
import { makeInstanceUrl } from "../../url";

export type APGuildInvite = APObject & { type: "GuildInvite" };

export const buildAPGuildInvite = (invite: Invite): APGuildInvite => {
	return {
		type: "GuildInvite",
		id: makeInstanceUrl(`/invite/${invite.code}`),
		attributedTo: buildAPActor(invite.guild),
	};
};
