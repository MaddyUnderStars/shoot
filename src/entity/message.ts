import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	UpdateDateColumn,
} from "typeorm";
import { AttributesOnly } from "../util";
import { BaseModel } from "./basemodel";
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
	@JoinColumn()
	author: User;

	// @ManyToOne("channels")
	// @JoinColumn()
	// channel: Channel;

	@ManyToOne("users")
	@JoinColumn()
	to: User;

	public toPublic() {
		return {
			id: this.id,
			content: this.content,
			published: this.published,
			updated: this.updated,
			author: this.author.toPublic(),
			to: this.to.toPublic(),
		} as PublicMessage;
	}

	public toPrivate() {
		return this.toPublic();
	}
}

export type PublicMessage = Omit<AttributesOnly<Message>, "author" | "to"> & {
	author: PublicUser;
	to: PublicUser;
};
