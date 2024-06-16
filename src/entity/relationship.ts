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
import { PublicUser, User } from "./user";

export enum RelationshipType {
	pending = 0,
	accepted = 1,
	blocked = 2,
}

@Entity("relationships")
@Index(["from", "to"], { unique: true })
export class Relationship extends BaseModel {
	@ManyToOne("users")
	from: User;

	@ManyToOne("users")
	to: User;

	/** The state of the relationship in the direction of from user -> to user */
	@Column({ enum: RelationshipType })
	from_state: RelationshipType;

	@Column({ enum: RelationshipType })
	to_state: RelationshipType;

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
		throw new Error("Use .toClient");
	}

	public toPrivate() {
		throw new Error("Use .toClient");
	}

	public toClient(our_id: string): PrivateRelationship {
		const dir = this.to?.id == our_id;

		return {
			created: this.created,
			user: dir ? this.from.toPublic() : this.to.toPublic(),
			type: dir ? this.to_state : this.from_state,
		};
	}
}

export const PrivateRelationship = z
	.object({
		created: z.date(),
		user: PublicUser,
		type: z.nativeEnum(RelationshipType),
	})
	.openapi("PrivateRelationship");

export type PrivateRelationship = z.infer<typeof PrivateRelationship>;
