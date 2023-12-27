import { Column, Entity, TableInheritance } from "typeorm";
import { WithKeys } from "./withKeys";

@Entity("channels")
@TableInheritance({ column: { type: String, name: "type" } })
export class Channel extends WithKeys {
	@Column()
	name: string;

	@Column({ type: String, nullable: true })
	domain: string | null;

	@Column()
	public_key: string;

	@Column({ nullable: true, type: String })
	private_key: string | null;

	public toPublic(): PublicChannel {
		return {
			id: this.id,
			name: this.name,
			domain: this.domain,
		};
	}

	public toPrivate(): PublicChannel {
		return this.toPublic();
	}
}

export type PublicChannel = Pick<Channel, "id" | "name" | "domain">;
