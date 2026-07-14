import {
	AnyAPObject,
	APObject,
	isAPObject,
	isObjectField,
} from "@shootpub/activitypub-types/object";
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
	return (
		isAPObject(obj) &&
		"name" in obj &&
		typeof obj.name === "string" &&
		!!obj.name &&
		"attributedTo" in obj &&
		isObjectField(obj.attributedTo) &&
		obj.type === "InviteCode"
	);
};
