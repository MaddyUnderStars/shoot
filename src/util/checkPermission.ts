import type { Guild, User } from "../entity";
import { Member } from "../entity/member";
import { Role } from "../entity/role";
import { getDatabase } from "./database";
import { PERMISSION } from "./permission";

export const checkPermission = async (
	user: User,
	guild: Guild,
	permission: PERMISSION | PERMISSION[],
) => {
	permission = Array.isArray(permission) ? permission : [permission];

	if (guild.owner.id === user.id) return true;

	// const roles = guild.roles
	// 	// every role our user is a member of
	// 	.filter((x) => x.members.find((x) => x.user.id === user.id))
	// 	.sort((a, b) => a.position - b.position);
	/*
			const roles = (
			await Role.find({
					where: {
						members: {
							user: {
								id: user.id,
							},
						},
						guild: {
							id: guild.id,
						},
					},
				})
				).sort((a, b) => a.position - b.position);
	 */
	// TODO: making this function async may have consequences
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
		// if this role includes admin perm, and we aren't requesting owner perms, we're good
		if (
			role.allow.includes(PERMISSION.ADMIN) &&
			!permission.includes(PERMISSION.OWNER)
		)
			return true;

		// if every requested permission is allowed in this role, we're good
		if (permission.every((x) => role.allow.includes(x))) allowed = true;
		// if one of them is denied, we're not good
		if (permission.find((x) => role.deny.includes(x))) allowed = false;
		// if it's neutral, we just use the last set value
	}

	return allowed;
};
