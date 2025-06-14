import { BeforeRemove, Column, Entity, ManyToOne } from "typeorm";
import { z } from "zod";
import { createLogger } from "../util/log";
import { deleteFile } from "../util/storage";
import { BaseModel } from "./basemodel";
import type { Message } from "./message";
import { LocalUpload } from "./upload";

const Log = createLogger("attachments");

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

	@ManyToOne("messages", (obj: Message) => obj.files, { onDelete: "CASCADE" })
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

	@BeforeRemove()
	public on_delete() {
		deleteFile(this.message.channel.id, this.hash)
			.catch((e) => Log.error("Failed to delete attachment", e))
			.then(() => {
				LocalUpload.delete({
					hash: this.hash,
					channel: { id: this.message.channel.id },
				}).catch((e) =>
					Log.error("Failed to delete LocalUpload for attachment"),
				);
			});
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
