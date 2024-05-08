import { Column, Entity, ManyToOne } from "typeorm";
import { z } from "zod";
import { BaseModel } from "./basemodel";
import { Guild, PublicGuild } from "./guild";

@Entity("invites")
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
			guild: this.guild.toPublic(),
		};
	}
}

export type PublicInvite = Pick<Invite, "code" | "expires"> & {
	guild: PublicGuild;
};

export const PublicInvite: z.ZodType<PublicInvite> = z.object({
	code: z.string(),
	guild: PublicGuild,
	expires: z.date(),
});
