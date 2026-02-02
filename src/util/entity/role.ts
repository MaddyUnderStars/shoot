import { ObjectIsPerson } from "activitypub-types";
import type { Member } from "../../entity/member";
import { Role } from "../../entity/role";
import { APError } from "../activitypub/error";
import {
	resolveAPObject,
	resolveCollectionEntries,
	resolveId,
	resolveWebfinger,
} from "../activitypub/resolve";
import { type APRole, ObjectIsRole } from "../activitypub/transformers/role";
import { splitQualifiedMention } from "../activitypub/util";
import { getDatabase } from "../database";
import { tryParseUrl } from "../url";
import { getOrFetchGuild } from "./guild";
import { getOrFetchMember } from "./member";

export const createRoleFromRemote = async (lookup: string | APRole) => {
	const id = resolveId(lookup);
	const mention = splitQualifiedMention(id);

	const obj =
		id instanceof URL
			? await resolveAPObject(id)
			: await resolveWebfinger(id);

	if (!ObjectIsRole(obj))
		throw new APError(`Expected role but found ${obj.type}`);

	if (!obj.attributedTo || typeof obj.attributedTo !== "string")
		throw new APError("role requires attributedTo guild");

	const role = Role.create({
		remote_id: mention.id,
		name: obj.name,
		allow: obj.allow,
		deny: obj.deny,
		position: obj.position,
		guild: await getOrFetchGuild(resolveId(obj.attributedTo)),
		members: [], // to be fetched later
	});

	const members = await Promise.all([
		...(await resolveCollectionEntries(new URL(obj.members))).reduce(
			(prev, curr) => {
				if (typeof curr === "string") {
					const url = tryParseUrl(curr);
					if (!url) return prev;
					prev.push(getOrFetchMember(url));
				} else if (ObjectIsPerson(curr)) {
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

export const updateRoleOrdering = async (guild_id: string) => {
	const sql = `
update roles as r
set position = r2.rn
from (select id, row_number() over (order by position) as rn from channels) as r2
where r.id = r2.id and r."guildId" = $1`;

	await getDatabase().query(sql, [guild_id]);
};
