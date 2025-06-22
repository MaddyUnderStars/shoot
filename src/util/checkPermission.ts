import type { Guild } from "../entity/guild";
import { Member } from "../entity/member";
import { Role } from "../entity/role";
import type { User } from "../entity/user";
import { getDatabase } from "./database";
import { PERMISSION } from "./permission";

export const checkPermission = async (
	user: User,
	guild: Guild,
	permission: PERMISSION | PERMISSION[],
) => {
	permission = Array.isArray(permission) ? permission : [permission];

	if (guild.owner.id === user.id) return true; // we're the owner, all perms
	if (permission.includes(PERMISSION.OWNER)) return false; // we're not owner, and requesting owner perms

	const roles = (
		await getDatabase()
			.getRepository(Role)
			.createQueryBuilder("roles")
			.leftJoin("roles.members", "members")
			.where("roles.guildId = :guild_id", { guild_id: guild.id })
			.andWhere((qb) => {
				const sub = qb
					.subQuery()
					.select("id")
					.from(Member, "members")
					.where("members.userId = :user_id", { user_id: user.id })
					.getQuery();

				qb.where(`roles_members.guildMembersId in ${sub}`);
			})
			.getMany()
	).sort((a, b) => a.position - b.position);

	let allowed = false;
	// for every role in order
	for (const role of roles) {
		// this role has admin, allow it
		if (role.allow.includes(PERMISSION.ADMIN)) return true;

		// if every requested permission is allowed in this role, we're good
		if (permission.every((x) => role.allow.includes(x))) allowed = true;
		// if one of them is denied, we're not good
		if (permission.find((x) => role.deny.includes(x))) allowed = false;
		// if it's neutral, we just use the last set value
	}

	return allowed;
};
