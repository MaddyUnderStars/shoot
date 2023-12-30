import { Column, CreateDateColumn, Entity, Index } from "typeorm";
import { config } from "../util";
import { InstanceActor } from "../util/activitypub/instanceActor";
import { Actor } from "./actor";

@Entity("users")
@Index(["name", "domain"], { unique: true })
export class User extends Actor {
	@CreateDateColumn()
	registered_date: Date;

	/** The username of this user. Forms their mention */
	@Column()
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

	public toPublic = (): PublicUser => {
		const id =
			this.id == InstanceActor.id
				? `/actor`
				: `/users/${this.name}`;

		return {
			name: this.name,
			display_name: this.display_name,
			domain: this.domain,
			summary: this.summary,
			publicKey: {
				id: `${config.federation.instance_url.origin}${id}`,
				owner: `${config.federation.webapp_url.origin}${id}`,
				publicKeyPem: this.public_key,
			},
		};
	};

	public toPrivate = (): PrivateUser => {
		return {
			email: this.email,

			...this.toPublic(),
		};
	};
}

export type PublicUser = Pick<User, "name" | "summary" | "display_name" | "domain"> & {
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
