import { BeforeRemove, Column, Entity, ManyToOne } from "typeorm";
import { z } from "zod";
import { createLogger } from "../util/log.js";
import { deleteFile } from "../util/storage/index.js";
import { BaseModel } from "./basemodel.js";
import type { Message } from "./message.js";
import { LocalUpload } from "./upload.js";

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
		void deleteFile(this.message.channel, this.hash)
			.catch((e) => Log.error("Failed to delete attachment", e))
			.then(() => {
				LocalUpload.delete({
					hash: this.hash,
					channel: { id: this.message.channel.id },
				}).catch((_) => Log.error("Failed to delete LocalUpload for attachment"));
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

export const AttachmentInitRequest = z
	.object({
		id: z
			.string()
			.describe(
				"Client defined ID for cross referencing attachments to output endpoints. Can be any value. Must be unique",
			),

		name: z.string().describe("User defined file name"),

		md5: z.string(), // md5 of the uploaded image

		mime: z.string(), // mime type
		size: z.number().describe("Size in bytes"), // bytes

		// we trust the client here, but only because we require the md5 hash and size
		// that should be good enough
		// I'm sure it'll bite me later, though
		width: z.number().optional(),
		height: z.number().optional(),
	})
	.array()
	.max(5) // TODO: config
	.refine((d) => new Set(d.map((x) => x.id)).size === d.length, "Attachment IDs must be unique")
	.openapi("AttachmentInitRequest");

export const AttachmentsResponse = z
	.array(
		z.object({
			id: z.string(),
			hash: z.string(),
			url: z.string(),
		}),
	)
	.openapi("AttachmentInitResponse");
