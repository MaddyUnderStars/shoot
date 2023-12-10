import {
	BaseEntity,
	Column,
	Entity,
	Index,
	PrimaryGeneratedColumn,
} from "typeorm";

@Entity("users")
export class User extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: string;

	/** The username of this user. Forms their mention */
	@Index()
	@Column({ unique: true })
	username: string;

	/** Tokens generated past this date are valid */
	@Column()
	valid_tokens_since: Date;

	@Column()
	password_hash: string;

	/** The preferred/display name of this user */
	@Column()
	display_name: string;

	/** The domain this user originates from */
	@Column()
	domain: string;

	/** The email address of this user */
	@Column({ type: String, nullable: true })
	email: string | null;

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
