import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToOne,
	UpdateDateColumn,
} from "typeorm";
import { z } from "zod";
import { AttributesOnly } from "../util";
import { ApCache } from "./apcache";
import { BaseModel } from "./basemodel";
import { Channel } from "./channel";
import { User } from "./user";

@Entity("messages")
export class Message extends BaseModel {
	/** The content of this message */
	@Column({ nullable: true, type: String })
	content: string;

	/** The publish date of this message */
	@CreateDateColumn()
	published: Date;

	/** The date this message was updated */
	@UpdateDateColumn({ nullable: true, type: Date })
	updated: Date | null;

	/** The author of this message */
	@ManyToOne("users")
	author: User;

	/** The channel this message is associated with */
	@ManyToOne("channels")
	channel: Channel;

	/**
	 * The reference object this message was created from.
	 * Messages sent from here don't have this.
	 */
	@OneToOne("activitypub_objects", { nullable: true })
	@JoinColumn()
	reference_object: ApCache | null;

	public toPublic() {
		return {
			id: this.id,
			content: this.content,
			published: this.published,
			updated: this.updated,

			// this sillyness is because typeorm's loadRelationIds: true doesn't map them into objects,
			// but into strings. silly
			author_id:
				typeof this.author == "string" ? this.author : this.author.id,
			channel_id:
				typeof this.channel == "string"
					? this.channel
					: this.channel.id,
		} as PublicMessage;
	}

	public toPrivate() {
		return this.toPublic();
	}
}

export type PublicMessage = Pick<
	AttributesOnly<Message>,
	"id" | "content" | "published" | "updated"
> & {
	author_id: string;
	channel_id: string;
};

export const PublicMessage: z.ZodType<PublicMessage> = z
	.object({
		id: z.string(),
		content: z.string(),
		published: z.date(),
		updated: z.date(),
		author_id: z.string(),
		channel_id: z.string(),
	})
	.openapi("PublicMessage");
