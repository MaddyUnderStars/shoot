import { Column, Entity, ManyToMany, ManyToOne } from "typeorm";
import { z } from "zod";
import { BaseModel } from "./basemodel";
import type { Role } from "./role";
import { PublicUser, type User } from "./user";

@Entity("guild_members")
export class Member extends BaseModel {
	@Column({ type: String, nullable: true })
	nickname: string | null;

	@ManyToOne("users", { onDelete: "CASCADE" })
	user: User;

	@ManyToMany("roles", "members", { onDelete: "CASCADE" })
	roles: Role[];

	public toPublic() {
		return {
			id: this.id,
			nickname: this.nickname,
			user: this.user.toPublic(),
			roles: this.roles.map((x) => x.remote_id ?? x.id),
		};
	}

	public toPrivate() {
		return this.toPublic();
	}
}

export type PublicMember = Pick<Member, "nickname" | "id"> & {
	user: PublicUser;
	roles: string[];
};

export const PublicMember: z.ZodType<PublicMember> = z.object({
	id: z.string().uuid(),
	nickname: z.string(),
	user: PublicUser,
	roles: z.string().array(),
});
