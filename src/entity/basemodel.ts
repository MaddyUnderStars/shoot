import merge from "ts-deepmerge";
import { BaseEntity, PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseModel extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	/** Get a public representation of this entity, to be sent to clients. */
	public abstract toPublic(): unknown;
	/** Get a private representation of this entity, to be sent to clients. */
	public abstract toPrivate(): unknown;

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
}
