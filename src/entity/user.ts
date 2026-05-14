import { Column, Entity, Index, ManyToOne } from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants";
import { Actor } from "./actor";
import { InstanceInvite } from "./instanceInvite";
import { getImageProxyUrl } from "../util/embeds";
import { UrlTransformer } from "../util/columns";

@Entity("users")
@Index(["name", "domain"], { unique: true })
export class User extends Actor {
	/**
	 * The username of this user. Forms their mention
	 * Do not allow modification, as this will break federation.
	 */
	@Column({ update: false })
	name: string;

	/** Tokens generated past this date are valid */
	@Column({ nullable: true, type: "timestamptz" })
	valid_tokens_since: Date | null;

	/** The password hash of this user. If null, this user is not from our domain */
	@Column({ nullable: true, type: String })
	password_hash: string | null;

	/** The email address of this user */
	@Column({ type: String, nullable: true })
	email: string | null;

	/** the invite code used to register to this instance */
	@ManyToOne(() => InstanceInvite, {
		nullable: true,
		onDelete: "CASCADE",
	})
	invite: InstanceInvite | null;

	/** User customisation fields start here */

	/** The preferred/display name of this user */
	@Column()
	display_name: string;

	/** The user's bio */
	@Column({ nullable: true, type: String })
	summary: string | null;

	/**
	 * user avatar. if null, no avatar
	 * if URL, this is a remote avatar and should be fetched via media proxy
	 * if not, this is a hash
	 */
	@Column({
		nullable: true,
		type: String,
		transformer: UrlTransformer,
	})
	avatar: URL | string | null;

	/**
	 * user banner. if null, no banner
	 * if URL, this is a remote banner and should be fetched via media proxy
	 * if not, this is a hash
	 */
	@Column({
		nullable: true,
		type: String,
		transformer: UrlTransformer,
	})
	banner: URL | string | null;

	public get mention(): ActorMention {
		return `${this.name}@${this.domain}`;
	}

	public toPublic = (): PublicUser => {
		return {
			mention: this.mention,
			name: this.name,
			display_name: this.display_name,
			summary: this.summary,
			// TODO #87 local avatar/banner uploads
			avatar: this.avatar instanceof URL ? getImageProxyUrl(this.avatar, 500, 500).href : "",
			banner: this.banner instanceof URL ? getImageProxyUrl(this.banner, 1500, 500).href : "",
		};
	};

	public toPrivate = (): PrivateUser => {
		return {
			email: this.email,

			...this.toPublic(),
		};
	};
}

export type PublicUser = Pick<User, "name" | "summary" | "display_name"> & {
	mention: ActorMention;
	avatar?: string;
	banner?: string;
};
export type PrivateUser = PublicUser & Pick<User, "email">;

export const PublicUser: z.ZodType<PublicUser> = z
	.object({
		mention: ActorMention,
		name: z.string(),
		summary: z.string(),
		display_name: z.string(),
		avatar: z.url().optional(),
		banner: z.url().optional(),
	})
	.openapi("PublicUser");

export const PrivateUser: z.ZodType<PrivateUser> = PublicUser.and(
	z.object({
		email: z.string(),
	}),
).openapi("PrivateUser");
