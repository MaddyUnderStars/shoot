import {
	APActor,
	APOrganization,
	ObjectIsOrganization,
} from "activitypub-types";
import { Guild, GuildTextChannel, Member, User } from "../../entity";
import {
	APError,
	resolveAPObject,
	resolveCollectionEntries,
	resolveWebfinger,
	splitQualifiedMention,
} from "../activitypub";
import { config } from "../config";
import { emitGatewayEvent } from "../events";
import { tryParseUrl } from "../url";
import { generateSigningKeys } from "./actor";
import { createGuildTextChannel, getOrFetchChannel } from "./channel";
import { getOrFetchUser } from "./user";

export const getOrFetchGuild = async (lookup: string | APOrganization) => {
	const id = typeof lookup == "string" ? lookup : lookup.id;

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

	emitGatewayEvent([owner.id], {
		type: "GUILD_CREATE",
		guild: guild.toPublic(),
	});

	// create channels

	await createGuildTextChannel("general", guild);

	return guild;
};

export const createGuildFromRemoteOrg = async (lookup: string | APActor) => {
	const mention =
		typeof lookup == "string"
			? splitQualifiedMention(lookup)
			: splitQualifiedMention(lookup.id!);

	const obj =
		typeof lookup == "string"
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

	if (!obj.attributedTo || typeof obj.attributedTo != "string")
		throw new APError(
			"Resolved org doesn't have attributedTo, we don't know what owns it",
		);

	if (typeof obj.inbox != "string" || typeof obj.outbox != "string")
		throw new APError("don't know how to handle embedded inbox/outbox");

	if (!obj.following || !obj.followers)
		throw new APError(
			"Resolved org must have following/followers to determine channels/users respectively",
		);

	if (!obj.id) throw new APError("Org must have ID");

	const getOrFetchMember = async (id: string) => {
		const user = await getOrFetchUser(id);

		const member = Member.create({
			user,

			// TODO: roles and shit
		});

		return member;
	};

	const guild = Guild.create({
		domain: mention.domain,
		remote_id: mention.user,

		name: obj.name,
		owner: await getOrFetchUser(obj.attributedTo),

		// to be assigned later
		channels: [],

		members: await Promise.all([
			...(
				await resolveCollectionEntries(
					new URL(obj.followers.toString()),
				)
			)
				.filter((x) => x != obj.attributedTo)
				.map((x) => getOrFetchMember(x)),
		]),

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

	return guild;
};
