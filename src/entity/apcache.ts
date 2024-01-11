import { APActivity, AnyAPObject } from "activitypub-types";
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("activitypub_objects")
export class ApCache extends BaseEntity {
	@PrimaryColumn()
	id: string;

	@CreateDateColumn()
	published: Date;

	@Column({ type: "simple-json" })
	raw: AnyAPObject | APActivity;
}