import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToOne,
} from "typeorm";
import { z } from "zod";
import { ApCache } from "./apcache";
import { BaseModel } from "./basemodel";
import { User } from "./user";

export enum RelationshipType {
	pending = 0,
	accepted = 1,

	// TODO: Modeling blocks this way will make it impossible to model 2 way blocks
	// or to know which of the two has blocked eachother
	// Removing the unique index on `from` and `to` would allow for 2 Relationship entities to exist
	// with type = block, but now you have to remove the constraint, so likely no.
	// We could instead use 3 block states (toBlocked, fromBlocked, bothBlocked)
	// but that is kind of messy.
	blocked = 2,
}

@Entity("relationships")
@Index(["from", "to"], { unique: true })
export class Relationship extends BaseModel {
	@ManyToOne("users")
	from: User;

	@ManyToOne("users")
	to: User;

	@Column({ enum: RelationshipType })
	type: RelationshipType;

	@CreateDateColumn()
	created: Date;

	/**
	 * The reference object this message was created from.
	 * Messages sent from here don't have this.
	 */
	@OneToOne("activitypub_objects", { nullable: true })
	@JoinColumn()
	reference_object: ApCache | null;

	public toPublic() {
		throw new Error("Do not return relationships publicly");
	}

	public toPrivate() {
		return {
			from_id: this.from.mention,
			to_id: this.to.mention,
			type: this.type,
			created: this.created,
		};
	}
}

export const PrivateRelationship = z
	.object({
		created: z.date(),
		from_id: z.string(),
		to_id: z.string(),
		type: z.nativeEnum(RelationshipType),
	})
	.openapi("PrivateRelationship");
