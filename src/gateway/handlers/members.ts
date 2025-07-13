import { makeHandler } from ".";
import { DMChannel } from "../../entity/DMChannel";
import { GuildTextChannel } from "../../entity/textChannel";
import { User } from "../../entity/user";
import type { ActorMention } from "../../util/activitypub/constants";
import { getDatabase } from "../../util/database";
import { channelInGuild, getChannel } from "../../util/entity/channel";
import { listenGatewayEvent } from "../../util/events";
import { PERMISSION } from "../../util/permission";
import { consume } from "../util/listener";
import { SUBSCRIBE_MEMBERS } from "../util/validation/receive";
import type { MEMBERS_CHUNK, ROLE_MEMBER_ADD } from "../util/validation/send";
import type { Websocket } from "../util/websocket";

export type MembersChunkItem = {
	name: string;
	member_id?: string;
	user_id: ActorMention;
};

/**
 * Subscribe to changes in the range
 * I.e., when a member enters or leaves
 * by changing memberships, roles, or status ( online <-> offline/invis )
 */
export const onSubscribeMembers = makeHandler(async function (payload) {
	const channel = await getChannel(payload.channel_id);
	if (!channel) throw new Error("Channel does not exist");

	await channel.throwPermission(
		User.create({ id: this.user_id }),
		PERMISSION.VIEW_CHANNEL,
	);

	this.member_list.channel_id = channel.id;
	this.member_list.range = payload.range.sort((a, b) => a - b);

	// TODO: this is a placeholder, simpler version for dm channels
	// since they don't use the members table like guilds do
	if (channel instanceof DMChannel) {
		const members = [channel.owner, ...channel.recipients];

		const items = [];

		for (const member of members) {
			items.push({
				user_id: member.mention, // TODO
				name: member.display_name ?? member.name,
			});

			listenRangeEvent(this, member.id, channel.id);
		}

		unsubscribeOutOfRange(this, items);

		return consume(this, {
			type: "MEMBERS_CHUNK",
			items,
		});
	}

	// can't type Channel automatically because typeorm table inheritance is weird
	if (!(channel instanceof GuildTextChannel)) {
		return;
	}

	// TODO: this query will be very slow
	const members = await getMembers(
		channel.id,
		this.member_list.range[0],
		this.member_list.range[1],
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

			listenRangeEvent(this, member.member_id, channel.id);

			items.push({
				member_id: member.member_id,
				user_id: `${member.name}@${member.user_domain}`,
				name: member.display_name ?? member.name,
			});
		}
	}

	unsubscribeOutOfRange(this, items);

	consume(this, {
		type: "MEMBERS_CHUNK",
		items,
	});
}, SUBSCRIBE_MEMBERS);

/**
 * Listen for guild members who gain roles and move into our listen range
 */
export const handleMemberListRoleAdd = async (
	socket: Websocket,
	event: ROLE_MEMBER_ADD,
) => {
	if (!socket.member_list.channel_id) return; // hm

	// If this event is for a guild that does not contain our channel, ignore it
	if (
		!(await channelInGuild(socket.member_list.channel_id, event.guild_id))
	) {
		return;
	}

	// find the new position of the user who got the role
	const position = await getMemberPosition(
		socket.member_list.channel_id,
		...(socket.member_list.range ?? [0, 100]),
		event.member.id,
	);

	if (!position) {
		// they aren't in our range, don't care
		return;
	}

	await listenRangeEvent(
		socket,
		event.member.id,
		socket.member_list.channel_id,
	);
};

/**
 * Listen to this user, and if they leave the range, stop listening
 */
const listenRangeEvent = async (
	socket: Websocket,
	target_id: string,
	channel_id: string,
) => {
	if (socket.member_list.events[target_id]) return;
	if (socket.user_id === target_id) return;

	const unsubscribe = () => {
		socket.member_list.events[target_id]();
		delete socket.member_list.events[target_id];
	};

	// TODO: don't we also want to subscribe to the user id?

	socket.member_list.events[target_id] = listenGatewayEvent(
		target_id,
		async (payload) => {
			// Listening to a member id is intended to only send requests about that guild member
			// And so we just need to track the events that move their position within the list

			switch (payload.type) {
				case "ROLE_MEMBER_LEAVE":
				case "ROLE_MEMBER_ADD": {
					// A member had a role added or removed

					const position = await getMemberPosition(
						channel_id,
						...(socket.member_list.range ?? [0, 100]),
						target_id,
					);

					if (!position) {
						unsubscribe();
						break;
					}

					// TODO: send event for updated position in list

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
		},
	);
};

const unsubscribeOutOfRange = (
	socket: Websocket,
	items: MEMBERS_CHUNK["items"],
) => {
	const keep = new Set(
		items
			.filter((x) => typeof x !== "string")
			.map((x) => x.member_id ?? x.user_id),
	);

	// Remove all subscriptions that are not in the new range
	const [_, remove] = partition(Object.keys(socket.member_list.events), (x) =>
		keep.has(x),
	);

	for (const x of remove) {
		if (!socket.member_list.events[x]) continue;

		socket.member_list.events[x]();
		delete socket.member_list.events[x];
	}
};

/* https://stackoverflow.com/a/50636286 */
export function partition<T>(array: T[], filter: (elem: T) => boolean) {
	const pass: T[] = [];
	const fail: T[] = [];
	for (const e of array) {
		(filter(e) ? pass : fail).push(e);
	}
	return [pass, fail];
}

const MEMBERS_QUERY = `
				select
					ROW_NUMBER() over (order by "r"."position" desc, "users"."name" asc) as position,
					"gm"."id" member_id,
					"r"."id" role_id,
					"users"."id" user_id,
					"users"."domain" user_domain,
					"users"."display_name" display_name,
					"users"."name" name
				from guild_members gm
					left join users on "users"."id" = "gm"."userId" 
					left join roles_members_guild_members rm on "gm"."id" = "rm"."guildMembersId"
					left join roles r on "r"."id" = "rm"."rolesId"
					left join channels on "channels"."guildId"  = "r"."guildId"
				where channels.id = $1
				order by "r"."position" desc, "users"."name" asc
				offset $2
				limit $3;
			`;

const getMemberPosition = async (
	channel_id: string,
	range_low: number,
	range_high: number,
	member_id: string,
): Promise<number | undefined> => {
	const ret = await getDatabase().query(
		`SELECT position FROM (${MEMBERS_QUERY}) sub WHERE sub.member_id = $4`,
		[channel_id, range_low, range_high, member_id],
	);

	return ret[0]?.position;
};

const getMembers = async (
	channel_id: string,
	range_low: number,
	range_high: number,
): Promise<
	Array<{
		member_id: string;
		role_id: string;
		user_id: string;
		user_domain?: string;
		display_name: string;
		name: string;
	}>
> => {
	return await getDatabase().query(MEMBERS_QUERY, [
		channel_id,
		range_low,
		range_high,
	]);
};
