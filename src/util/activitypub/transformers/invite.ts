import type { AnyAPObject, APObject } from "activitypub-types";
import type { Invite } from "../../../entity/invite.js";
import { makeInstanceUrl } from "../../url.js";
import { buildAPActor } from "./actor.js";

export type APInviteCode = APObject & { type: "InviteCode" };

export const buildAPGuildInvite = (invite: Invite): APInviteCode => {
	return {
		type: "InviteCode",
		id: makeInstanceUrl(`/invite/${invite.code}`),
		name: invite.code,
		attributedTo: buildAPActor(invite.guild),
	};
};

export const ObjectIsInvite = (obj: AnyAPObject): obj is APInviteCode => {
	return obj.type === "InviteCode";
};
