import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./user";

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

	@OneToMany(
		() => User,
		(user) => user.invite,
	)
	users: User[];

	/** the maximum number of uses for this invite. if null, unlimited usage */
	@Column({ type: Number, nullable: true })
	maxUses: number | null;
}
