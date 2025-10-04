import {
	BaseEntity,
	Entity,
	OneToMany,
	OneToOne,
	PrimaryColumn,
} from "typeorm";
import z from "zod";
import type { ActorMention } from "../util/activitypub/constants";
import { splitQualifiedMention } from "../util/activitypub/util";
import type { User } from "./user";
import {
	PrivateUserChannelSettings,
	UserChannelSettings,
} from "./userChannelSettings";

@Entity("user_settings")
export class UserSetting extends BaseEntity {
	@PrimaryColumn()
	userId: string;

	@OneToOne("users", (user: User) => user.settings)
	user: User;

	@OneToMany(
		"user_channel_settings",
		(override: UserChannelSettings) => override.userSettings,
		{ onDelete: "CASCADE" },
	)
	channelSettings: UserChannelSettings[];

	public getChannelSettings = async (id: ActorMention) => {
		if (this.channelSettings)
			return (
				this.channelSettings.find((x) => x.channel.mention === id) ??
				null
			);

		const split = splitQualifiedMention(id);

		return UserChannelSettings.findOne({
			where: {
				channel: {
					id: split.id,
					domain: split.domain,
				},
				userSettingsUserId: this.userId,
			},
		});
	};

	public toPrivate = (): PrivateUserSettings => {
		return {
			channelSettings: this.channelSettings.map((x) => x.toPrivate()),
		};
	};

	/*
		TODO:
		- guild overrides
	*/
}

export const PrivateUserSettings = z.object({
	channelSettings: PrivateUserChannelSettings.array(),
});

export type PrivateUserSettings = z.infer<typeof PrivateUserSettings>;
