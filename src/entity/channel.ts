import { Column, Entity, TableInheritance } from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants";
import { HttpError } from "../util/httperror";
import type { PERMISSION } from "../util/permission";
import { Actor } from "./actor";
import type { User } from "./user";

@Entity("channels")
@TableInheritance({ column: { type: String, name: "type" } })
export class Channel extends Actor {
	@Column()
	name: string;

	public toPublic(): PublicChannel {
		return {
			mention: this.mention,
			name: this.name,
		};
	}

	public toPrivate(): PublicChannel {
		return this.toPublic();
	}

	public throwPermission = async (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => {
		// todo: which permission?
		if (!(await this.checkPermission(user, permission)))
			throw new HttpError("Missing permission", 400);
		return true;
	};

	public checkPermission = async (
		user: User,
		permission: PERMISSION | PERMISSION[],
	): Promise<boolean> => false;
}

export type PublicChannel = Pick<Channel, "name" | "mention">;

export const PublicChannel: z.ZodType<PublicChannel> = z
	.object({
		mention: ActorMention,
		name: z.string(),
	})
	.openapi("PublicChannel");
