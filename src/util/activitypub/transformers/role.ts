import type { APObject } from "activitypub-types";
import type { Role } from "../../../entity";
import { getExternalPathFromActor } from "../../../sender";
import type { PERMISSION } from "../../permission";
import { makeInstanceUrl } from "../../url";

export const ObjectIsRole = (role: APObject): role is APRole =>
	role.type === "Role";

export type APRole = APObject & {
	type: "Role";
	members: string;
	name: string;
	allow: PERMISSION[];
	deny: PERMISSION[];
	position: number;
};

export const buildAPRole = (role: Role): APRole => {
	const id = makeInstanceUrl(
		`${getExternalPathFromActor(role.guild)}/role/${role.id}`,
	);

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
