import { makeHandler } from ".";
import { Member, User } from "../../entity";
import { PERMISSION, getChannel, listenGatewayEvent } from "../../util";
import { type MEMBERS_CHUNK, SUBSCRIBE_MEMBERS, type Websocket } from "../util";

/**
 * Listen to this guild member, and if they leave the range, stop listening
 */
const listenRangeEvent = (socket: Websocket, member_id: string) => {
	// listenEvents(this, [member.id], (socket, payload) => {
	// 	if (payload.type === "ROLE_MEMBER_ADD" ||
	// 		// payload.type === member leave
	// 		// status change
	// 		// etc
	// 	) {
	// 	}
	// })

	if (socket.events[member_id]) socket.events[member_id]();

	socket.events[member_id] = listenGatewayEvent(member_id, (payload) => {
		if (
			payload.type === "ROLE_MEMBER_ADD"
			// payload.type === member leave
			// status change
			// etc
		) {
			// Check if still within range
			const position = payload.role_id;
		}
	});
};

export const onSubscribeMembers = makeHandler(async function (payload) {
	const channel = await getChannel(payload.channel_id);
	if (!channel) throw new Error("Channel does not exist");

	channel.throwPermission(
		User.create({ id: this.user_id }),
		PERMISSION.VIEW_CHANNEL,
	);

	this.member_range = payload.range.sort((a, b) => a - b);

	// Get all the members in the range currently

	// TODO: this logic doesn't work for dm channels
	// because they don't use the members table
	// Should probably just modify dm channels to use members channel instead of
	// having a `recipients` property.

	const members = await Member.find({
		where: {
			roles: {
				guild: {
					channels: {
						id: channel.id,
					},
				},
			},
		},
		skip: this.member_range[0] ?? 0,
		take: this.member_range[1] ?? 100,
		// order: {
		// 	roles: {
		// 		position: "DESC",
		// 	},
		// },
		relations: {
			user: true,
			roles: true,
		},
	});

	const roles = new Set(members.flatMap((m) => m.roles.map((r) => r.id)));

	const items: MEMBERS_CHUNK["items"] = [];

	for (const role of roles) {
		const [role_members] = partition(
			members,
			(m) => !!m.roles.find((r) => r.id === role),
		);

		items.push(role);
		items.push(
			...role_members.reduce<{ id: string; name: string }[]>(
				(ret, member) => {
					if (
						channel.checkPermission(
							member.user,
							PERMISSION.VIEW_CHANNEL,
						)
					) {
						// subscribe to the changes of this member

						listenRangeEvent(this, member.id);

						ret.push({
							id: member.user.id,
							name: member.user.display_name,
						});
					}

					return ret;
				},
				[],
			),
		);
	}

	// Subscribe to their changes

	// Subscribe to changes in the range
	// I.e., when a member enters or exits the range
	// by changing memberships, roles, or status ( online <-> offline/invis )
}, SUBSCRIBE_MEMBERS);

/* https://stackoverflow.com/a/50636286 */
export function partition<T>(array: T[], filter: (elem: T) => boolean) {
	const pass: T[] = [];
	const fail: T[] = [];
	for (const e of array) {
		(filter(e) ? pass : fail).push(e);
	}
	return [pass, fail];
}
