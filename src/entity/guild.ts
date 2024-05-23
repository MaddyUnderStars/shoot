import {
	AfterLoad,
	Column,
	Entity,
	JoinColumn,
	JoinTable,
	ManyToOne,
	OneToMany,
} from "typeorm";
import { z } from "zod";
import { PERMISSION, checkPermission } from "../util";
import { Actor } from "./actor";
import { PublicChannel } from "./channel";
import { PublicRole, Role } from "./role";
import { GuildTextChannel } from "./textChannel";
import { User } from "./user";

@Entity("guilds")
export class Guild extends Actor {
	@Column()
	name: string;

	@Column({ type: String, nullable: true })
	summary: string | null;

	@OneToMany("roles", "guild")
	roles: Role[];

	@ManyToOne("users")
	@JoinColumn()
	owner: User;

	@Column({ type: String, nullable: true })
	remote_id: string | null;

	// TODO: channel sorting
	@OneToMany("channels", "guild")
	@JoinTable()
	channels: GuildTextChannel[];

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

			roles: this.roles ? this.roles.map((x) => x.toPublic()) : undefined,
		};
	}

	public toPrivate(): PublicGuild {
		return this.toPublic();
	}

	public checkPermission = (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => checkPermission(user, this, permission);

	@AfterLoad()
	_sortRoles = () => {
		if (this.roles) this.roles.sort((a, b) => b.position - a.position);
	};
}

export type PublicGuild = Pick<Guild, "id" | "name" | "domain"> & {
	channels?: PublicChannel[];
	roles?: PublicRole[];
};

export const PublicGuild: z.ZodType<PublicGuild> = z
	.object({
		id: z.string(),
		name: z.string(),
		domain: z.string(),
		channels: PublicChannel.array().optional(),
		roles: PublicRole.array().optional(),
	})
	.openapi("PublicGuild");