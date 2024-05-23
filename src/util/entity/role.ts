import { Role } from "../../entity/role";
import {
	APError,
	APRole,
	resolveAPObject,
	resolveCollectionEntries,
	splitQualifiedMention,
} from "../activitypub";
import { getOrFetchGuild } from "./guild";
import { getOrFetchMember } from "./member";

export const createRoleFromRemote = async (lookup: string | APRole) => {
	const mention =
		typeof lookup == "string"
			? splitQualifiedMention(lookup)
			: splitQualifiedMention(lookup.id!);

	const obj = await resolveAPObject(lookup);

	if (obj.type != "Role")
		throw new APError(`Expected role but found ${obj.type}`);

	if (!obj.attributedTo || typeof obj.attributedTo != "string")
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
		...(await resolveCollectionEntries(new URL(obj.members))).map((x) =>
			getOrFetchMember(x),
		),
	]);

	role.members = members;

	return role;
};
