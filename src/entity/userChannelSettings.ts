import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import z from "zod";
import { ActorMention } from "../util/activitypub/constants";
import type { Channel } from "./channel";
import type { UserSetting } from "./userSetting";

export enum ChannelNotificationPreferences {
	NONE = 0,
	ONLY_MENTIONS = 1,
	ALL = 2,
}

@Entity("user_channel_settings")
export class UserChannelSettings extends BaseEntity {
	@PrimaryColumn()
	channelId: string;

	@PrimaryColumn()
	userSettingsUserId: string;

	@ManyToOne("channels", {
		onDelete: "CASCADE",
	})
	channel: Channel;

	@ManyToOne("user_settings")
	userSettings: UserSetting;

	public toPrivate = (): PrivateUserChannelSettings => {
		return {
			id: this.channel.mention,
			notifications: this.notifications,
			muted_until: this.muted_until,
		};
	};

	// --- START OF SETTINGS ---

	/**
	 * Notification preferences.
	 */
	@Column({ type: "enum", enum: ChannelNotificationPreferences })
	notifications: ChannelNotificationPreferences;

	/**
	 * Whether this channel is muted.
	 * A channel can be unmuted and will revert to it's notification preference
	 */
	@Column({ nullable: true, type: Date })
	muted_until: Date;
}

export const PrivateUserChannelSettings = z.object({
	id: ActorMention,
	notifications: z.nativeEnum(ChannelNotificationPreferences),
	muted_until: z.date(),
});

export type PrivateUserChannelSettings = z.infer<
	typeof PrivateUserChannelSettings
>;
