import { APObject } from "@shootpub/activitypub-types/object";
import type { Role } from "../../../entity/role.js";
import { getExternalPathFromActor } from "../../../sender/index.js";
import type { PERMISSION } from "../../permission.js";
import { makeInstanceUrl } from "../../url.js";

export const ObjectIsRole = (role: APObject): role is APRole => role.type === "Role";

export type APRole = APObject & {
	type: "Role";
	members: string;
	name: string;
	allow: PERMISSION[];
	deny: PERMISSION[];
	position: number;
};

export const buildAPRole = (role: Role): APRole => {
	const id = makeInstanceUrl(`${getExternalPathFromActor(role.guild)}/role/${role.id}`);

	return {
		type: "Role",
		id,

		name: role.name,

		allow: role.allow,
		deny: role.deny,

		position: role.position,

		attributedTo: makeInstanceUrl(getExternalPathFromActor(role.guild)),
		members: `${id}/members`,
	};
};
