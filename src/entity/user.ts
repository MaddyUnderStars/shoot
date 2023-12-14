import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { config } from "../util";
import { BaseModel } from "./basemodel";

@Entity("users")
@Index(["username", "domain"], { unique: true })
export class User extends BaseModel {
	@PrimaryGeneratedColumn()
	id: string;

	/** The username of this user. Forms their mention */
	@Column()
	username: string;

	/** Tokens generated past this date are valid */
	@Column({ nullable: true, type: Date })
	valid_tokens_since: Date | null;

	/** The password hash of this user. If null, this user is not from our domain */
	@Column({ nullable: true, type: String })
	password_hash: string | null;

	/** The preferred/display name of this user */
	@Column()
	display_name: string;

	/** The domain this user originates from */
	@Column()
	domain: string;

	/** The email address of this user */
	@Column({ type: String, nullable: true })
	email: string | null;

	/** The private key for this user, used to sign activities sent to external instances */
	@Column({ type: String, nullable: true })
	private_key: string | null;

	/** The public key of this user. Exists on both external and internal users */
	@Column()
	public_key: string;

	@Column({ type: "simple-json", nullable: true })
	activitypub_addresses: {
		inbox: string;
		outbox: string;
		followers?: string;
		following?: string;
	};

	/**
	 * TODO:
	 * followers
	 * following
	 * public key
	 * private key
	 */

	public toPublic = (): PublicUser => {
		return {
			username: this.username,
			display_name: this.display_name,
			domain: this.domain,
			publicKey: {
				id: `${config.federation.instance_url.origin}/users/${this.username}@${this.domain}`,
				owner: `${config.federation.instance_url.origin}/users/${this.username}@${this.domain}`,
				publicKeyPem: this.public_key,
			}
		};
	};

	public toPrivate = (): PrivateUser => {
		return {
			email: this.email,

			...this.toPublic(),
		};
	};
}

export type PublicUser = Pick<User, "username" | "display_name" | "domain"> & {
	publicKey?: {
		/** The ID of this public key. Typically `https://example.com/users/username#main-key`. */
		id: string;
		/** The owner of this key. Typically matches actor ID. */
		owner: string;
		/** The RSA public key. */
		publicKeyPem: string;
	};
};
export type PrivateUser = PublicUser & Pick<User, "email">;
