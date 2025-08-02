import { merge } from "ts-deepmerge";
import { BaseEntity, BeforeInsert, BeforeUpdate, PrimaryColumn } from "typeorm";
import { v7 as uuidv7 } from "uuid";

export abstract class BaseModel extends BaseEntity {
	@PrimaryColumn({ type: "uuid" })
	id: string;

	/** Get a public representation of this entity, to be sent to clients. */
	public abstract toPublic(): unknown;
	/** Get a private representation of this entity, to be sent to clients. */
	public toPrivate() {
		return this.toPublic();
	}

	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: incorrect lint
	private toJSON = () => {
		throw new Error(
			"Do not return database entities directly. Call .toPublic or .toPrivate",
		);
	};

	// todo: better types
	public assign(props: object) {
		Object.assign(this, merge(this, props));
		return this;
	}

	@BeforeInsert()
	@BeforeUpdate()
	public generate_id() {
		if (!this.id) this.id = uuidv7();
	}
}
