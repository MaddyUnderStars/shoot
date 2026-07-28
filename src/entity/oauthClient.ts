import { BaseEntity, BeforeInsert, BeforeUpdate, Column, Entity, PrimaryColumn } from "typeorm";
import { v7 as uuidv7 } from "uuid";

@Entity("oauth_clients")
export class OauthClient extends BaseEntity {
	@PrimaryColumn({ type: "uuid" })
	id: string;

	@Column({ type: String, nullable: true })
	name: string | null;

	@Column()
	secret: string;

	@Column({ type: "simple-array" })
	grants: string[];

	@Column({ type: "simple-array" })
	redirectUris: string[];

	public toPublic(): unknown {
		throw new Error("Method not implemented.");
	}

	@BeforeInsert()
	@BeforeUpdate()
	public generate_id() {
		if (!this.id) this.id = uuidv7();
	}
}
