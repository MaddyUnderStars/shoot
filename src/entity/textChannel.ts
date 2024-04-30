import { ChildEntity, ManyToOne } from "typeorm";
import { z } from "zod";
import { Channel } from "./channel";
import { Guild } from "./guild";

@ChildEntity("guild_text")
export class GuildTextChannel extends Channel {
	// permission overwrites
	// category?

	@ManyToOne("guilds")
	guild: Guild;

	public toPublic(): PublicGuildTextChannel {
		return {
			...super.toPublic(),
			guild_id: this.guild?.id,
		};
	}

	public toPrivate(): PublicGuildTextChannel {
		return this.toPublic();
	}
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
