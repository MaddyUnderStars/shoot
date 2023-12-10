import {
	BaseEntity,
	Column,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from "typeorm";

@Entity("users")
@Index(["username", "domain"], { unique: true })
export class User extends BaseEntity {
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
		};
	};

	public toPrivate = (): PrivateUser => {
		return {
			email: this.email,

			...this.toPublic(),
		};
	};

	private toJSON = () => {
		throw new Error("Do not return database entities directly. Call .toPublic or .toPrivate");
	}
}

export type PublicUser = Pick<User, "username" | "display_name" | "domain">;
export type PrivateUser = PublicUser & Pick<User, "email">;
