import { ChildEntity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { Channel } from "./channel";
import { User } from "./user";

@ChildEntity("dm")
export class DMChannel extends Channel {
	/** The recipients of the DM channel, other than the owner */
	@ManyToMany("users", { cascade: true, orphanedRowAction: "delete" })
	@JoinTable()
	recipients: User[];

	@ManyToOne("users")
	@JoinColumn()
	owner: User;
}