import { makeHandler } from ".";
import { User } from "../../entity";
import {
	PERMISSION,
	getChannel,
	getDatabase,
	listenGatewayEvent,
} from "../../util";
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

	socket.events = socket.events ?? [];
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

	await channel.throwPermission(
		User.create({ id: this.user_id }),
		PERMISSION.VIEW_CHANNEL,
	);

	this.member_range = payload.range.sort((a, b) => a - b);

	// Get all the members in the range currently

	// TODO: this logic doesn't work for dm channels
	// because they don't use the members table
	// Should probably just modify dm channels to use members channel instead of
	// having a `recipients` property.

	// TODO: broken, returns nothing
	// const members = await getDatabase()
	// 	.getRepository(Member)
	// 	.createQueryBuilder("members")
	// 	.leftJoin("members.roles", "role")
	// 	.leftJoin(GuildTextChannel, "channel", "channel.guildId = role.guildId")
	// 	.where("channel.id = :channel_id", { channel_id: channel.id })
	// 	.orderBy("role.position", "DESC")
	// 	.skip(payload.range[0] ?? 0)
	// 	.take(payload.range[1] ?? 100)
	// 	.addSelect("role.position")
	// 	.getMany();

	// TODO: this query will be very slow
	const members: Array<{
		member_id: string;
		role_id: string;
		user_id: string;
		name: string;
	}> = await getDatabase().query(`
				select
					"gm"."id" member_id,
					"r"."id" role_id,
					"users"."id" user_id,
					"users"."name"
				from guild_members gm
					left join users on "users"."id" = "gm"."userId" 
					left join roles_members_guild_members rm on "gm"."id" = "rm"."guildMembersId"
					left join roles r on "r"."id" = "rm"."rolesId"
					left join channels on "channels"."guildId"  = "r"."guildId"
				where channels.id = 'f405d678-639f-47c7-a0ad-e808b2e6351a'
				order by "r"."position" desc;
			`);

	const roles = new Set(members.map((x) => x.role_id));

	const items: MEMBERS_CHUNK["items"] = [];

	for (const role of roles) {
		const [role_members] = partition(members, (m) => m.role_id === role);

		items.push(role);

		for (const member of role_members) {
			if (
				await channel.checkPermission(
					User.create({ id: member.user_id }),
					PERMISSION.VIEW_CHANNEL,
				)
			) {
				listenRangeEvent(this, member.member_id);
				items.push({
					id: member.user_id,
					name: member.name,
				});
			}
		}
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
