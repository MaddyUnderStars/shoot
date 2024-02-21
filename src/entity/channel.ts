import { Column, Entity, TableInheritance } from "typeorm";
import { z } from "zod";
import { Actor } from "./actor";

@Entity("channels")
@TableInheritance({ column: { type: String, name: "type" } })
export class Channel extends Actor {
	@Column()
	name: string;

	/** The remote ID of this channel, forms its mention */
	@Column({ type: String, nullable: true })
	remote_id: string | null;

	public get mention() {
		return `${this.remote_id ?? this.id}@${this.domain}`;
	}

	public toPublic(): PublicChannel {
		return {
			id: this.remote_id ?? this.id,
			name: this.name,
			domain: this.domain,
		};
	}

	public toPrivate(): PublicChannel {
		return this.toPublic();
	}
}

export type PublicChannel = Pick<Channel, "id" | "name" | "domain">;

export const PublicChannel: z.ZodType<PublicChannel> = z
	.object({
		id: z.string(),
		name: z.string(),
		domain: z.string(),
	})
	.openapi("PublicChannel");
