/**
 * {
    channel_id: string;
    name: string;
    size: number;
    mime: string;
    md5: string;
    width?: number;
    height?: number;
}
 */

import { Column, Entity, ManyToOne } from "typeorm";
import { BaseModel } from "./basemodel.js";
import type { Channel } from "./channel.js";
import { User } from "./user.js";

/**
 * TODO: this class duplicates data in the Attachment entity unfortunately
 * It's meant to mirror how s3 stores metadata about an object,
 * and I didn't want to create Attachments on upload vs on message send which is currently done
 */
@Entity("local_uploads")
export class LocalUpload extends BaseModel {
	@ManyToOne("channels", { onDelete: "CASCADE", nullable: true })
	channel: Channel | null;

	@ManyToOne("users", { onDelete: "CASCADE", nullable: true })
	user: User | null;

	@Column()
	hash: string;

	@Column()
	size: number;

	@Column()
	mime: string;

	@Column()
	md5: string;

	@Column({ type: Number, nullable: true })
	width: number | null;

	@Column({ type: Number, nullable: true })
	height: number | null;

	public toPublic() {
		throw new Error("Unused");
	}
}
