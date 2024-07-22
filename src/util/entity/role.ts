import { ObjectIsPerson } from "activitypub-types";
import type { Member } from "../../entity";
import { Role } from "../../entity/role";
import {
	APError,
	type APRole,
	resolveAPObject,
	resolveCollectionEntries,
	splitQualifiedMention,
} from "../activitypub";
import { getOrFetchGuild } from "./guild";
import { getOrFetchMember } from "./member";

export const createRoleFromRemote = async (lookup: string | APRole) => {
	const mention =
		typeof lookup === "string"
			? splitQualifiedMention(lookup)
			: // biome-ignore lint/style/noNonNullAssertion: <explanation>
				splitQualifiedMention(lookup.id!);

	const obj = await resolveAPObject(lookup);

	if (obj.type !== "Role")
		throw new APError(`Expected role but found ${obj.type}`);

	if (!obj.attributedTo || typeof obj.attributedTo !== "string")
		throw new APError("role requires attributedTo guild");

	const role = Role.create({
		remote_id: mention.user,
		name: obj.name,
		allow: obj.allow,
		deny: obj.deny,
		guild: await getOrFetchGuild(obj.attributedTo),
		members: [], // to be fetched later
	});

	const members = await Promise.all([
		...(await resolveCollectionEntries(new URL(obj.members))).reduce(
			(prev, curr) => {
				if (typeof curr === "string" || ObjectIsPerson(curr)) {
					prev.push(getOrFetchMember(curr));
				}
				return prev;
			},
			[] as Array<Promise<Member>>,
		),
	]);

	role.members = members;

	return role;
};
