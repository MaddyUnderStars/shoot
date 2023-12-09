import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("migrations")
export class Migration extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: "bigint" })
	timestamp: number;

	@Column()
	name: string;
}
