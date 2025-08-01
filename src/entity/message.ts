import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	OneToOne,
	UpdateDateColumn,
} from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants";
import type { AttributesOnly } from "../util/types";
import type { ApCache } from "./apcache";
import { type Attachment, PublicAttachment } from "./attachment";
import { BaseModel } from "./basemodel";
import type { Channel } from "./channel";
import type { User } from "./user";

@Entity("messages")
export class Message extends BaseModel {
	/** The content of this message */
	@Column({ nullable: true, type: String })
	content: string | null;

	/** The publish date of this message */
	@CreateDateColumn()
	published: Date;

	/** The date this message was updated */
	@UpdateDateColumn({ nullable: true, type: Date })
	updated: Date | null;

	/** The author of this message */
	@ManyToOne("users", { onDelete: "CASCADE" })
	author: User;

	/** The channel this message is associated with */
	@ManyToOne("channels", { onDelete: "CASCADE" })
	channel: Channel;

	/** the attached files of this message */
	@OneToMany("attachments", (attachment: Attachment) => attachment.message, {
		cascade: true,
		orphanedRowAction: "delete",
	})
	files: Attachment[];

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
			author_id: this.author.mention,
			channel_id: this.channel.mention,
			files: this.files ? this.files.map((x) => x.toPublic()) : [],
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
	author_id: ActorMention;
	channel_id: ActorMention;
};

export const PublicMessage: z.ZodType<PublicMessage> = z
	.object({
		id: z.string().uuid(),
		content: z.string(),
		published: z.date(),
		updated: z.date(),
		author_id: ActorMention,
		channel_id: ActorMention,
		files: z.array(PublicAttachment),
	})
	.openapi("PublicMessage");

export const MessageCreateRequest = z.object({
	content: z.string(),
	files: z
		.array(
			z.object({
				name: z.string(),
				hash: z.string(),
			}),
		)
		.optional(),
});

export type MessageCreateRequest = z.infer<typeof MessageCreateRequest>;
