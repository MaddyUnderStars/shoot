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
import { BaseModel } from "./basemodel";
import type { Channel } from "./channel";

/**
 * TODO: this class duplicates data in the Attachment entity unfortunately
 * It's meant to mirror how s3 stores metadata about an object,
 * and I didn't want to create Attachments on upload vs on message send which is currently done
 */
@Entity("local_uploads")
export class LocalUpload extends BaseModel {
	@ManyToOne("channels", { cascade: ["remove"] })
	channel: Channel;

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
