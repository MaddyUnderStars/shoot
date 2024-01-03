import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	UpdateDateColumn,
} from "typeorm";
import { AttributesOnly } from "../util";
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

	public toPublic() {
		return {
			id: this.id,
			content: this.content,
			published: this.published,
			updated: this.updated,

			// this sillyness is because typeorm's loadRelationIds: true doesn't map them into objects,
			// but into strings. silly
			author_id: typeof this.author == "string" ? this.author : this.author.id,
			channel_id: typeof this.channel == "string" ? this.channel : this.channel.id,
		} as PublicMessage;
	}

	public toPrivate() {
		return this.toPublic();
	}
}

export type PublicMessage = Omit<
	AttributesOnly<Message>,
	"author" | "channel"
> & {
	author_id: string;
	channel_id: string;
};
