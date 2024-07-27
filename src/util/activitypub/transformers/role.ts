import { APObject } from "activitypub-types";
import type { Role } from "../../../entity";
import { getExternalPathFromActor } from "../../../sender";
import { config } from "../../config";
import type { PERMISSION } from "../../permission";

export const ObjectIsRole = (role: APObject): role is APRole =>
	role.type === "Role";

export type APRole = APObject & {
	type: "Role";
	members: string;
	name: string;
	allow: PERMISSION[];
	deny: PERMISSION[];
};

export const buildAPRole = (role: Role): APRole => {
	const id = `${config.federation.instance_url.origin}${getExternalPathFromActor(role.guild)}/role/${role.id}`;

	return {
		type: "Role",
		id,

		name: role.name,

		allow: role.allow,
		deny: role.deny,

		attributedTo: `${config.federation.instance_url.origin}${getExternalPathFromActor(role.guild)}`,
		members: `${id}/members`,
	};
};
