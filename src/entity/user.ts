import { Column, Entity, Index } from "typeorm";
import { z } from "zod";
import { Actor } from "./actor";

@Entity("users")
@Index(["name", "domain"], { unique: true })
export class User extends Actor {
	/**
	 * The username of this user. Forms their mention
	 * Do not allow modification, as this will break federation.
	 */
	@Column({ update: false })
	name: string;

	/** The user's bio */
	@Column({ nullable: true, type: String })
	summary: string | null;

	/** Tokens generated past this date are valid */
	@Column({ nullable: true, type: Date })
	valid_tokens_since: Date | null;

	/** The password hash of this user. If null, this user is not from our domain */
	@Column({ nullable: true, type: String })
	password_hash: string | null;

	/** The preferred/display name of this user */
	@Column()
	display_name: string;

	/** The email address of this user */
	@Column({ type: String, nullable: true })
	email: string | null;

	public get mention() {
		return `${this.name}@${this.domain}`;
	}

	public toPublic = (): PublicUser => {
		return {
			id: this.id,
			name: this.name,
			display_name: this.display_name,
			domain: this.domain,
			summary: this.summary,
		};
	};

	public toPrivate = (): PrivateUser => {
		return {
			email: this.email,

			...this.toPublic(),
		};
	};
}

export type PublicUser = Pick<
	User,
	"name" | "summary" | "display_name" | "domain" | "id"
>;
export type PrivateUser = PublicUser & Pick<User, "email">;

export const PublicUser: z.ZodType<PublicUser> = z
	.object({
		id: z.string(),
		name: z.string(),
		summary: z.string(),
		display_name: z.string(),
		domain: z.string(),
	})
	.openapi("PublicUser");

export const PrivateUser: z.ZodType<PrivateUser> = PublicUser.and(
	z.object({
		email: z.string(),
	}),
).openapi("PrivateUser");
