import { Column } from "typeorm";
import { BaseModel } from "./basemodel";

export abstract class WithKeys extends BaseModel {
	/** The private key for this user, used to sign activities sent to external instances */
	@Column({ type: String, nullable: true })
	private_key: string | null;

	/** The public key of this user. Exists on both external and internal users */
	@Column()
	public_key: string;
}
