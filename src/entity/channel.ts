import { Column, Entity, TableInheritance } from "typeorm";
import { BaseModel } from "./basemodel";

@Entity("channels")
@TableInheritance({ column: { type: String, name: "type" } })
export class Channel extends BaseModel {
	@Column()
	name: string;

	// todo: guilds

	@Column({ type: String, nullable: true })
	domain: string | null;

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
