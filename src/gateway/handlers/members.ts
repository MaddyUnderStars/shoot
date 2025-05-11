import { makeHandler } from ".";
import { DMChannel, User } from "../../entity";
import {
	PERMISSION,
	getChannel,
	getDatabase,
	listenGatewayEvent,
} from "../../util";
import {
	type MEMBERS_CHUNK,
	SUBSCRIBE_MEMBERS,
	type Websocket,
	consume,
} from "../util";

/**
 * Listen to this guild member, and if they leave the range, stop listening
 */
const listenRangeEvent = (socket: Websocket, member_id: string) => {
	socket.events = socket.events ?? [];
	if (socket.events[member_id]) socket.events[member_id]();

	const unsubscribe = () => socket.events[member_id]();

	socket.events[member_id] = listenGatewayEvent(member_id, (payload) => {
		// Listening to a member id is intended to only send requests about that guild member
		// And so we just need to track the events that move their position within the list

		switch (payload.type) {
			case "ROLE_MEMBER_LEAVE":
			case "ROLE_MEMBER_ADD": {
				// A member had a role added or removed
				// TODO: Find their new position and if it's outside the range, unsub
				// I would prefer to not use any async methods here, because this function is in the hot path
				// It's called (# member updates) * (# subscribed users)
				// Caching the results might be a solution, but then we have to hit the cache? unless it's a mem cache

				// Maybe there could be metadata sent with gateway events that doesn't get sent to clients?
				unsubscribe();
				break;
			}
			case "MEMBER_LEAVE": {
				// A member has left the guild, easy
				unsubscribe();
				break;
			}
		}

		socket.send({
			t: payload.type,
			d: { ...payload, type: undefined },
		});
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

	// TODO: this is a placeholder, simpler version for dm channels
	// since they don't use the members table like guilds do
	if (channel instanceof DMChannel) {
		const members = [channel.owner, ...channel.recipients];
		consume(this, {
			type: "MEMBERS_CHUNK",
			items: members.map((x) => ({
				member_id: x.mention, // TODO
				name: x.display_name ?? x.name,
			})),
		});
		return;
	}

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
		display_name: string;
		name: string;
	}> = await getDatabase().query(
		`
				select
					"gm"."id" member_id,
					"r"."id" role_id,
					"users"."id" user_id,
					"users"."display_name" display_name,
					"users"."name" name
				from guild_members gm
					left join users on "users"."id" = "gm"."userId" 
					left join roles_members_guild_members rm on "gm"."id" = "rm"."guildMembersId"
					left join roles r on "r"."id" = "rm"."rolesId"
					left join channels on "channels"."guildId"  = "r"."guildId"
				where channels.id = $1
				order by "r"."position" desc, "users"."name" asc;
			`,
		[channel.id],
	);

	const roles = new Set(members.map((x) => x.role_id));

	const items: MEMBERS_CHUNK["items"] = [];

	for (const role of roles) {
		const [role_members] = partition(members, (m) => m.role_id === role);

		items.push(role);

		for (const member of role_members) {
			if (
				!(await channel.checkPermission(
					User.create({ id: member.user_id }),
					PERMISSION.VIEW_CHANNEL,
				))
			)
				continue;

			listenRangeEvent(this, member.member_id);

			items.push({
				member_id: member.member_id,
				name: member.display_name ?? member.name,
			});
		}
	}

	// Subscribe to changes in the range
	// I.e., when a member enters
	// by changing memberships, roles, or status ( online <-> offline/invis )

	consume(this, {
		type: "MEMBERS_CHUNK",
		items,
	});
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
