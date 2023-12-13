import { BaseEntity, PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseModel extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: string;

	public abstract toPublic(): unknown;
	public abstract toPrivate(): unknown;

	private toJSON = () => {
		throw new Error(
			"Do not return database entities directly. Call .toPublic or .toPrivate",
		);
	};
}