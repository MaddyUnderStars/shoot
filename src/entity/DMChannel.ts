import {
	ChildEntity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
} from "typeorm";
import { Channel, PublicChannel } from "./channel";
import { User } from "./user";

@ChildEntity("dm")
export class DMChannel extends Channel {
	/** The recipients of the DM channel, other than the owner */
	@ManyToMany("users")
	@JoinTable()
	recipients: User[];

	@ManyToOne("users")
	@JoinColumn()
	owner: User;

	public toPublic(): PublicDmChannel {
		return {
			...super.toPublic(),

			owner_id: this.owner.mention,
			recipients: this.recipients.map((x) => x.mention),
		};
	}
}

export type PublicDmChannel = PublicChannel & {
	owner_id: string;
	recipients: string[];
};
