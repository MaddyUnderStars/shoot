import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	/** The username of this user. Forms their mention */
	@Column({ unique: true })
	username: string;

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
	 * password
	 */
}