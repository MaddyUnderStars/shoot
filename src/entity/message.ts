import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	UpdateDateColumn
} from "typeorm";
import { AttributesOnly } from "../util";
import { BaseModel } from "./basemodel";
import { Channel, PublicChannel } from "./channel";
import { PublicUser, User } from "./user";

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

	// @ManyToOne("channels")
	// @JoinColumn()
	// channel: Channel;

	@ManyToOne("channels")
	channel: Channel

	public toPublic() {
		return {
			id: this.id,
			content: this.content,
			published: this.published,
			updated: this.updated,
			author: this.author.toPublic(),
			channel: this.channel.toPublic(),
		} as PublicMessage;
	}

	public toPrivate() {
		return this.toPublic();
	}
}

export type PublicMessage = Omit<AttributesOnly<Message>, "author" | "channel"> & {
	author: PublicUser;
	channel: PublicChannel;
};
