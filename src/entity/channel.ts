import { Column, Entity, TableInheritance } from "typeorm";
import { z } from "zod";
import type { PERMISSION } from "../util";
import { HttpError } from "../util/httperror";
import { Actor } from "./actor";
import type { User } from "./user";

@Entity("channels")
@TableInheritance({ column: { type: String, name: "type" } })
export class Channel extends Actor {
	@Column()
	name: string;

	public get mention() {
		return `${this.remote_id ?? this.id}@${this.domain}`;
	}

	public toPublic(): PublicChannel {
		return {
			id: this.remote_id ?? this.id,
			name: this.name,
			domain: this.domain,
		};
	}

	public toPrivate(): PublicChannel {
		return this.toPublic();
	}

	public throwPermission = async (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => {
		// todo: which permision?
		if (!(await this.checkPermission(user, permission)))
			throw new HttpError("Missing permission", 400);
		return true;
	};

	public checkPermission = async (
		user: User,
		permission: PERMISSION | PERMISSION[],
	): Promise<boolean> => false;
}

export type PublicChannel = Pick<Channel, "id" | "name" | "domain">;

export const PublicChannel: z.ZodType<PublicChannel> = z
	.object({
		id: z.string(),
		name: z.string(),
		domain: z.string(),
	})
	.openapi("PublicChannel");
