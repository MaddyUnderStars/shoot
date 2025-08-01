import {
	ChildEntity,
	JoinColumn,
	JoinTable,
	ManyToMany,
	ManyToOne,
} from "typeorm";
import z from "zod";
import { ActorMention } from "../util/activitypub/constants";
import { DefaultPermissions, type PERMISSION } from "../util/permission";
import { Channel, PublicChannel } from "./channel";
import type { User } from "./user";

// TODO: DM channels should not exist
// Client side, a dm channel should just be a guild channel that gets pinned to the users channel list
// This would allow you to convert a dm channel to a guild and back easily
// and would simplify code a bit
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

			owner: this.owner.mention,
			recipients: this.recipients.map((x) => x.mention),
		};
	}

	public checkPermission = async (
		user: User,
		permission: PERMISSION | PERMISSION[],
	) => {
		permission = Array.isArray(permission) ? permission : [permission];

		if (
			this.owner.id === user.id ||
			this.recipients.find((x) => x.id === user.id)
		)
			return permission.every((x) => DefaultPermissions.includes(x));

		return false;
	};
}

export type PublicDmChannel = PublicChannel & {
	owner: ActorMention;
	recipients: ActorMention[];
};

export const PublicDmChannel: z.ZodType<PublicDmChannel> = PublicChannel.and(
	z.object({
		owner: ActorMention,
		recipients: ActorMention.array(),
	}),
).openapi("PublicDmChannel");
