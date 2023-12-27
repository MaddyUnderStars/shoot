import { BaseEntity, PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseModel extends BaseEntity {
	@PrimaryGeneratedColumn()
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
}
