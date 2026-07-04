import { BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import type { User } from "./user";
import type { Guild } from "./guild";

/**
 * Instance registration invite codes
 * If registration is disabled, you may give out codes which allow
 * users to register.
 */
@Entity("instance_invites")
export class InstanceInvite extends BaseEntity {
	@PrimaryColumn()
	code: string;

	/** the expiry date */
	@Column({ type: Date, nullable: true })
	expires: Date | null;

	@OneToMany("users", (user: User) => user.invite)
	users: User[];

	/** the maximum number of uses for this invite. if null, unlimited usage */
	@Column({ type: Number, nullable: true })
	maxUses: number | null;

	/** join this guild when this invite is used */
	@ManyToOne("guilds", { onDelete: "SET NULL", nullable: true })
	guild: Guild | null;
}
