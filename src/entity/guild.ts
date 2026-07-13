import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants.js";
import { checkPermission } from "../util/checkPermission.js";
import { HttpError } from "../util/httperror.js";
import type { PERMISSION } from "../util/permission.js";
import { Actor } from "./actor.js";
import { PublicRole, type Role } from "./role.js";
import { type GuildTextChannel, PublicGuildTextChannel } from "./textChannel.js";
import type { User } from "./user.js";

@Entity("guilds")
export class Guild extends Actor {
	@Column()
	name: string;

	@Column({ type: String, nullable: true })
	summary: string | null;

	@OneToMany("roles", "guild")
	roles: Role[];

	@ManyToOne("users", { onDelete: "CASCADE" })
	@JoinColumn()
	owner: User;

	@OneToMany("channels", "guild")
	channels: GuildTextChannel[];

	public toPublic(): PublicGuild {
		return {
			mention: this.mention,
			name: this.name,
			summary: this.summary ?? undefined,

			channels: this.channels ? this.channels.map((x) => x.toPublic()) : undefined,

			roles: this.roles ? this.roles.map((x) => x.toPublic()) : undefined,
		};
	}

	public toPrivate(): PublicGuild {
		return this.toPublic();
	}

	public throwPermission = async (user: User, permission: PERMISSION | PERMISSION[]) => {
		// todo: which permission?
		if (!(await this.checkPermission(user, permission)))
			throw new HttpError("Missing permission", 400);
		return true;
	};

	public checkPermission = async (user: User, permission: PERMISSION | PERMISSION[]) =>
		checkPermission(user, this, permission);

	@AfterLoad()
	_sort = () => {
		if (this.roles) this.roles.sort((a, b) => b.position - a.position);
		if (this.channels) this.channels.sort((a, b) => b.position - a.position);
	};
}

export type PublicGuild = Pick<Guild, "name"> & {
	channels?: PublicGuildTextChannel[];
	roles?: PublicRole[];
	mention: ActorMention;
	summary?: string;
};

export const PublicGuild: z.ZodType<PublicGuild> = z
	.object({
		mention: ActorMention,
		name: z.string(),
		summary: z.string().optional(),
		channels: PublicGuildTextChannel.array().optional(),
		roles: PublicRole.array().optional(),
	})
	.openapi("PublicGuild");
