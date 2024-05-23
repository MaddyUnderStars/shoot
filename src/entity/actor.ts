import { Column, Index } from "typeorm";
import { BaseModel } from "./basemodel";

export abstract class Actor extends BaseModel {
	/** The remote address of this actor. If this actor is local, it will be null. */
	@Column({ nullable: true, type: String })
	remote_address: string | null;

	@Column({ type: String, nullable: true })
	@Index({ unique: true, where: "remote_id IS NOT NULL" })
	remote_id: string | null;

	/** The domain of this actor. null if local */
	@Column({ type: String, nullable: true })
	domain: string | null;

	/**
	 * The addresses of the collections related to the remote actor
	 */
	@Column({ type: "simple-json", nullable: true })
	collections: {
		inbox: string;
		outbox: string;
		shared_inbox: string | undefined;
		followers?: string;
		following?: string;
	} | null;

	/**
	 * The private key for this user, used to sign activities sent to external instances
	 * If this is a remote actor, it will be null.
	 */
	@Column({ type: String, nullable: true })
	private_key: string | null;

	/** The public key of this user. Exists on both external and internal users */
	@Column({ nullable: true, type: String })
	public_key: string;

	public toPublic(): unknown {
		throw new Error("don't");
	}

	public toPrivate() {
		return this.toPublic();
	}
}
