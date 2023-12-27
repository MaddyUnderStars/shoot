import { ChildEntity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { Channel } from "./channel";
import { User } from "./user";

@ChildEntity("dm")
export class DMChannel extends Channel {
	@ManyToMany("users", { cascade: true, orphanedRowAction: "delete" })
	@JoinTable()
	recipients: User[];

	@ManyToOne("users")
	@JoinColumn()
	owner: User;
}