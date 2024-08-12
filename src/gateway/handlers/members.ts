import { makeHandler } from ".";
import { User } from "../../entity";
import { PERMISSION, getChannel } from "../../util";
import { SUBSCRIBE_MEMBERS } from "../util";

export const onSubscribeMembers = makeHandler(async function (payload) {
	const channel = await getChannel(payload.channel_id);
	if (!channel) throw new Error("Channel does not exist");

	channel.throwPermission(
		User.create({ id: this.user_id }),
		PERMISSION.VIEW_CHANNEL,
	);

	this.member_range = payload.range;

	// Get all the members in the range currently

	// TODO: this logic doesn't work for dm channels
	// because they don't use the members table
	// Should probably just modify dm channels to use members channel instead of
	// having a `recipients` property.

	// Subscribe to their changes

	// Subscribe to changes in the range
	// I.e., when a member enters or exits the range
	// by changing memberships, roles, or status ( online <-> offline/invis )
}, SUBSCRIBE_MEMBERS);
