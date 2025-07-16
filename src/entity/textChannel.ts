import { ChildEntity, Column, ManyToOne, Unique } from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants";
import { checkPermission } from "../util/checkPermission";
import type { PERMISSION } from "../util/permission";
import { Channel, PublicChannel } from "./channel";
import type { Guild } from "./guild";
import type { User } from "./user";

@ChildEntity("guild_text")
@Unique("channel_ordering", ["position", "guild"], {
	deferrable: "INITIALLY DEFERRED",
})
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
			guild: this.guild?.mention,
		};
	}

	public toPrivate(): PublicGuildTextChannel {
		return this.toPublic();
	}

	public checkPermission = async (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => checkPermission(user, this.guild, permission);
}

export type PublicGuildTextChannel = PublicChannel & {
	guild?: ActorMention;
};

export const PublicGuildTextChannel: z.ZodType<PublicGuildTextChannel> =
	PublicChannel.and(
		z.object({
			guild: ActorMention.optional(),
		}),
	).openapi("PublicGuildTextChannel");
