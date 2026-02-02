import {
	Column,
	Entity,
	Index,
	JoinTable,
	ManyToMany,
	ManyToOne,
} from "typeorm";
import { z } from "zod";
import { ActorMention } from "../util/activitypub/constants";
import { DefaultPermissions, PERMISSION } from "../util/permission";
import { BaseModel } from "./basemodel";
import type { Guild } from "./guild";
import type { Member } from "./member";

@Entity("roles")
@Index(["position", "guild"], { unique: true })
export class Role extends BaseModel {
	/**
	 * Roles are federated objects, and to prevent ID collision,
	 * we need to generate local IDs and store the remote ID to track foreign roles
	 */
	@Column({ type: String, nullable: true })
	@Index({ unique: true, where: "remote_id IS NOT NULL" })
	remote_id: string | null;

	@Column()
	name: string;

	@ManyToOne("guilds", { onDelete: "CASCADE" })
	guild: Guild;

	@Column()
	position: number;

	@Column({
		type: "enum",
		enum: PERMISSION,
		array: true,
		default: DefaultPermissions,
	})
	allow: PERMISSION[];

	@Column({
		type: "enum",
		enum: PERMISSION,
		array: true,
		default: [],
	})
	deny: PERMISSION[];

	@ManyToMany("guild_members", "roles")
	@JoinTable()
	members: Member[];

	public toPublic(): PublicRole {
		return {
			id: this.remote_id ?? this.id,
			name: this.name,
			guild: this.guild?.mention,
			allow: this.allow,
			deny: this.deny,
		};
	}

	public toPrivate(): PublicRole {
		return this.toPublic();
	}
}

export type PublicRole = Pick<Role, "id" | "name" | "allow" | "deny"> & {
	guild?: ActorMention;
};

export const ZodPermission = z.nativeEnum(PERMISSION).openapi("Permission");

export const PublicRole: z.ZodType<Omit<PublicRole, "guild">> = z
	.object({
		id: z.string().uuid(),
		name: z.string(),
		allow: ZodPermission.array(),
		deny: ZodPermission.array(),
		guild: ActorMention,
	})
	.openapi("PublicRole");
