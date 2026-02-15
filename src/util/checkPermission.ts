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

	const flat = new Set<PERMISSION>();
	// for every role in order
	for (const role of roles) {
		// this role has admin, allow it
		if (role.allow.includes(PERMISSION.ADMIN)) return true;

		for (const allowed of role.allow) flat.add(allowed);
		for (const denied of role.deny) flat.add(denied);
	}

	return permission.every((perm) => flat.has(perm));
};
