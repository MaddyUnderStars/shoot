import type { AnyAPObject, APObject } from "activitypub-types";
import type { Invite } from "../../../entity/invite";
import { makeInstanceUrl } from "../../url";
import { buildAPActor } from "./actor";

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
