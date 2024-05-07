import {
	Column,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
	OneToMany,
} from "typeorm";
import { z } from "zod";
import { Actor } from "./actor";
import { PublicChannel } from "./channel";
import { Member } from "./member";
import { GuildTextChannel } from "./textChannel";
import { User } from "./user";

// TODO: instead of storing guild members as a manytomany here
// use the @everyone role to store them

@Entity("guilds")
export class Guild extends Actor {
	@Column()
	name: string;

	@ManyToOne("users")
	@JoinColumn()
	owner: User;

	// description
	// roles

	@Column({ type: String, nullable: true })
	remote_id: string | null;

	// TODO: channel sorting
	@OneToMany("channels", "guild")
	@JoinTable()
	channels: GuildTextChannel[];

	@ManyToMany("users")
	@JoinTable()
	members: Member[];

	public get mention() {
		return `${this.remote_id ?? this.id}@${this.domain}`;
	}

	public toPublic(): PublicGuild {
		return {
			id: this.remote_id ?? this.id,
			name: this.name,
			domain: this.domain,

			channels: this.channels
				? this.channels.map((x) => x.toPublic())
				: undefined,
		};
	}

	public toPrivate(): PublicGuild {
		return this.toPublic();
	}
}

export type PublicGuild = Pick<Guild, "id" | "name" | "domain"> & {
	channels?: PublicChannel[];
};

export const PublicGuild: z.ZodType<PublicGuild> = z
	.object({
		id: z.string(),
		name: z.string(),
		domain: z.string(),
		channels: PublicChannel.array().optional(),
	})
	.openapi("PublicGuild");
