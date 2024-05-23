import {
	Column,
	Entity,
	Index,
	JoinTable,
	ManyToMany,
	ManyToOne,
} from "typeorm";
import { z } from "zod";
import { DefaultPermissions, PERMISSION } from "../util/permission";
import { BaseModel } from "./basemodel";
import { Guild } from "./guild";
import { Member } from "./member";

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
		default: DefaultPermissions,
	})
	deny: PERMISSION[];

	@ManyToMany("guild_members", "roles")
	@JoinTable()
	members: Member[];

	public toPublic(): PublicRole {
		return {
			id: this.remote_id ?? this.id,
			name: this.name,
			guild_id: this.guild.id,
			allow: this.allow,
			deny: this.deny,
		};
	}

	public toPrivate(): PublicRole {
		return this.toPublic();
	}
}

export type PublicRole = Pick<Role, "id" | "name" | "allow" | "deny"> & {
	guild_id: string;
};

export const PublicRole: z.ZodType<PublicRole> = z.object({
	id: z.string(),
	name: z.string(),
	allow: z.number().array(),
	deny: z.number().array(),
	guild_id: z.string(),
});
