import { Column, Entity, ManyToOne } from "typeorm";
import { z } from "zod";
import { BaseModel } from "./basemodel";
import type { Message } from "./message";

@Entity("attachments")
export class Attachment extends BaseModel {
	/** user set name of this attachment */
	@Column()
	name: string;

	/** ID of this attachment in storage provider */
	@Column()
	hash: string;

	/** mime type */
	@Column()
	type: string;

	@Column()
	size: number;

	@Column({ type: Number, nullable: true })
	width: number | null;

	@Column({ type: Number, nullable: true })
	height: number | null;

	@ManyToOne("messages")
	message: Message;

	public toPublic(): PublicAttachment {
		return {
			name: this.name,
			type: this.type,
			hash: this.hash,
			size: this.size,
			width: this.width,
			height: this.height,
		};
	}
}

export const PublicAttachment = z
	.object({
		name: z.string(),
		hash: z.string(),
		type: z.string(),
		size: z.number(),
		width: z.number().nullable().optional(),
		height: z.number().nullable().optional(),
	})
	.openapi("PublicAttachment");

export type PublicAttachment = z.infer<typeof PublicAttachment>;
