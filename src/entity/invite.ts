import { Column, Entity, Index, ManyToOne } from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants.js";
import { BaseModel } from "./basemodel.js";
import type { Guild } from "./guild.js";

@Entity("invites")
@Index(["code", "guild"], { unique: true })
export class Invite extends BaseModel {
	@Column()
	code: string;

	@Column({ type: Date, nullable: true })
	expires: Date | null;

	@ManyToOne("guilds", { onDelete: "CASCADE" })
	guild: Guild;

	public toPrivate(): PublicInvite {
		return this.toPublic();
	}

	public toPublic(): PublicInvite {
		return {
			code: this.code,
			expires: this.expires,
			guild: this.guild.mention,
		};
	}
}

export type PublicInvite = Pick<Invite, "code" | "expires"> & {
	guild: ActorMention;
};

export const PublicInvite: z.ZodType<PublicInvite> = z.object({
	code: z.string(),
	guild: ActorMention,
	expires: z.date(),
});
