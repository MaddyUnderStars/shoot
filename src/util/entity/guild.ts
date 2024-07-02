import {
	ObjectIsOrganization,
	type APActor,
	type APOrganization,
} from "activitypub-types";
import { Guild, Member, User, type GuildTextChannel } from "../../entity";
import { Role } from "../../entity/role";
import {
	APError,
	resolveAPObject,
	resolveCollectionEntries,
	resolveWebfinger,
	splitQualifiedMention,
} from "../activitypub";
import { config } from "../config";
import { emitGatewayEvent } from "../events";
import { DefaultPermissions } from "../permission";
import { tryParseUrl } from "../url";
import { generateSigningKeys } from "./actor";
import { createGuildTextChannel, getOrFetchChannel } from "./channel";
import { createRoleFromRemote } from "./role";
import { getOrFetchUser } from "./user";

export const joinGuild = async (user_id: string, guild_id: string) => {
	const member = await Member.create({
		user: User.create({ id: user_id }),
		roles: [Role.create({ id: guild_id })],
	}).save();

	emitGatewayEvent(guild_id, {
		type: "MEMBER_JOIN",
		member: member.toPublic(),
	});

	emitGatewayEvent(user_id, {
		type: "GUILD_CREATE",
		guild: (
			await Guild.findOneOrFail({ where: { id: guild_id } })
		).toPublic(),
	});

	return member;
};

export const getOrFetchGuild = async (lookup: string | APOrganization) => {
	const id = typeof lookup === "string" ? lookup : lookup.id;

	if (!id) throw new APError("Cannot fetch guild without ID");

	const mention = splitQualifiedMention(id);

	let guild = await Guild.findOne({
		where: [
			{
				id: mention.user,
				domain: mention.domain,
			},
			{
				remote_id: mention.user,
				domain: mention.domain,
			},
			{
				remote_address: id,
			},
		],
		relations: { channels: true },
	});

	if (!guild && config.federation.enabled) {
		// fetch from remote instance
		guild = await createGuildFromRemoteOrg(lookup);
		await guild.save();
	} else if (!guild) {
		throw new APError("Guild could not be found", 404);
	}

	return guild;
};

export const createGuild = async (name: string, owner: User) => {
	const guild = await Guild.create({
		name,
		owner,

		domain: config.federation.webapp_url.hostname,
	}).save();

	setImmediate(() => generateSigningKeys(guild));

	emitGatewayEvent(owner.id, {
		type: "GUILD_CREATE",
		guild: guild.toPublic(),
	});

	// create channels

	await createGuildTextChannel("general", guild);

	// create roles

	// everyone
	const everyone = await Role.create({
		id: guild.id,
		name: "everyone",
		guild,
		allow: DefaultPermissions,
		position: 0,
	}).save();

	guild.roles = [everyone];

	emitGatewayEvent(guild.id, {
		type: "ROLE_CREATE",
		role: everyone.toPublic(),
	});

	emitGatewayEvent(guild.id, {
		type: "ROLE_MEMBER_ADD",
		user_id: owner.id,
		role_id: everyone.id,
	});

	return guild;
};

export const createGuildFromRemoteOrg = async (lookup: string | APActor) => {
	const mention =
		typeof lookup === "string"
			? splitQualifiedMention(lookup)
			: // biome-ignore lint/style/noNonNullAssertion: <explanation>
				splitQualifiedMention(lookup.id!);

	const obj =
		typeof lookup === "string"
			? tryParseUrl(lookup)
				? await resolveAPObject(lookup)
				: await resolveWebfinger(lookup)
			: lookup;

	if (!ObjectIsOrganization(obj))
		throw new APError("Resolved object is not Organization");

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Org but does not contain public key",
		);

	if (!obj.attributedTo || typeof obj.attributedTo !== "string")
		throw new APError(
			"Resolved org doesn't have attributedTo, we don't know what owns it",
		);

	if (typeof obj.inbox !== "string" || typeof obj.outbox !== "string")
		throw new APError("don't know how to handle embedded inbox/outbox");

	if (!obj.following || !obj.followers)
		throw new APError(
			"Resolved org must have following/followers to determine channels/users respectively",
		);

	if (!obj.id) throw new APError("Org must have ID");

	const guild = Guild.create({
		domain: mention.domain,
		remote_id: mention.user,

		name: obj.name,
		owner: await getOrFetchUser(obj.attributedTo),

		// to be assigned later
		channels: [],

		roles: [], // to be assigned later

		remote_address: obj.id,
		public_key: obj.publicKey.publicKeyPem,

		collections: {
			inbox: obj.inbox,
			shared_inbox: obj.endpoints?.sharedInbox,
			outbox: obj.outbox,
			followers: obj.followers?.toString(),
			following: obj.following?.toString(),
		},
	});

	await guild.save();

	const channels = (await Promise.all([
		...(
			await resolveCollectionEntries(new URL(obj.following.toString()))
		).map((x) => getOrFetchChannel(x)),
	])) as GuildTextChannel[];

	guild.channels = channels;
	await guild.save();

	const roles = await Promise.all([
		...(
			await resolveCollectionEntries(new URL(obj.followers.toString()))
		).map((x) => createRoleFromRemote(x)),
	]);

	const everyone = roles.find((x) => x.remote_id === guild.remote_id);
	if (!everyone)
		// TOOD: construct one based on membership of all other roles?
		throw new APError("Remote guild did not have everyone role");

	// this should be modifying a reference, as roles are not primitives
	everyone.id = guild.id;

	guild.roles = roles;

	return guild;
};
