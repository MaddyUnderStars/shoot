import {
	ChildEntity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
} from "typeorm";
import { DefaultPermissions, PERMISSION } from "../util";
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

	public checkPermission = (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => {
		permission = Array.isArray(permission) ? permission : [permission];

		if (
			this.owner.id == user.id ||
			this.recipients.find((x) => x.id == user.id)
		)
			return permission.every((x) => DefaultPermissions.includes(x));

		return false;
	};
}

export type PublicDmChannel = PublicChannel & {
	owner_id: string;
	recipients: string[];
};
