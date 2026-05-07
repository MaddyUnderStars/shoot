import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import type { Channel } from "./channel";
import type { User } from "./user";

@Entity("voice_state")
export class VoiceState extends BaseEntity {
	@PrimaryColumn()
	userId: string;

	@ManyToOne("users", { onDelete: "CASCADE" })
	user: User;

	@ManyToOne("channels", { onDelete: "CASCADE" })
	channel: Channel;

	@Column({ type: "timestamptz" })
	joined: Date;
}
