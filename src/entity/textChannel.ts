import { ChildEntity, Column, Index, ManyToOne } from "typeorm";
import { z } from "zod";
import { type PERMISSION, checkPermission } from "../util";
import { Channel } from "./channel";
import type { Guild } from "./guild";
import type { User } from "./user";

@ChildEntity("guild_text")
@Index(["position", "guild"], { unique: true })
export class GuildTextChannel extends Channel {
	// permission overwrites
	// category?

	@ManyToOne("guilds", { onDelete: "CASCADE" })
	guild: Guild;

	@Column()
	position: number;

	public toPublic(): PublicGuildTextChannel {
		return {
			...super.toPublic(),
			guild_id: this.guild?.id,
		};
	}

	public toPrivate(): PublicGuildTextChannel {
		return this.toPublic();
	}

	public checkPermission = (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => checkPermission(user, this.guild, permission);
}

export type PublicGuildTextChannel = Pick<
	GuildTextChannel,
	"id" | "name" | "domain"
> & {
	guild_id?: string;
};

export const PublicGuildTextChannel: z.ZodType<PublicGuildTextChannel> = z
	.object({
		id: z.string(),
		name: z.string(),
		domain: z.string(),
		guild_id: z.string().optional(),
	})
	.openapi("PublicGuildTextChannel");
