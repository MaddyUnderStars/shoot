import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { OauthClient } from "./oauthClient.js";
import { User } from "./user.js";

@Entity("oauth_tokens")
export class OauthToken extends BaseEntity {
	@Column()
	type: "access" | "refresh" | "authorization";

	@PrimaryColumn()
	value: string;

	@Column({ type: Date, nullable: true })
	expires: Date | null;

	@Column({ type: String, nullable: true })
	redirectUri: string | null;

	@Column({ type: "simple-array" })
	scopes: string[];

	@ManyToOne("oauth_clients", { onDelete: "CASCADE" })
	client: OauthClient;

	@ManyToOne("users", { onDelete: "CASCADE" })
	user: User;

	@Column({ type: String, nullable: true })
	codeChallenge: string | null;

	@Column({ type: String, nullable: true })
	codeChallengeMethod: string | null;
}
