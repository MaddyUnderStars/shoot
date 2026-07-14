import { AnyAPObject } from "@shootpub/activitypub-types/object";
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("activitypub_objects")
export class ApCache extends BaseEntity {
	@PrimaryColumn()
	id: string;

	@CreateDateColumn()
	received: Date;

	@Column({ type: "jsonb" })
	raw: AnyAPObject;
}
