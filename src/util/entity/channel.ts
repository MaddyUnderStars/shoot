import crypto from "crypto";
import { promisify } from "util";
const generateKeyPair = promisify(crypto.generateKeyPair);

import {
	APActor,
	APCreate,
	ObjectIsGroup,
	ObjectIsOrganization,
	ObjectIsPerson,
} from "activitypub-types";
import { Brackets } from "typeorm";
import { Guild, GuildTextChannel, User } from "../../entity";
import { DMChannel } from "../../entity/DMChannel";
import { Channel } from "../../entity/channel";
import { getExternalPathFromActor, sendActivity } from "../../sender";
import {
	APError,
	addContext,
	buildAPGroup,
	resolveAPObject,
	resolveCollectionEntries,
	resolveWebfinger,
	splitQualifiedMention,
} from "../activitypub";
import { config } from "../config";
import { getDatabase } from "../database";
import { emitGatewayEvent } from "../events";
import { tryParseUrl } from "../url";
import { generateSigningKeys } from "./actor";
import { createGuildFromRemoteOrg } from "./guild";
import { findActorOfAnyType } from "./resolve";
import { createUserForRemotePerson, getOrFetchUser } from "./user";

export const createGuildTextChannel = async (name: string, guild: Guild) => {
	const channel = GuildTextChannel.create({
		name,
		guild,
		domain: config.federation.webapp_url.hostname,
		position: await GuildTextChannel.count({
			where: { guild: { id: guild.id } },
		}),
	});

	await channel.save();

	setImmediate(() => generateSigningKeys(channel));

	emitGatewayEvent([guild.owner.id], {
		type: "CHANNEL_CREATE",
		channel: channel.toPublic(),
	});

	return channel;
};

export const createDmChannel = async (
	name: string,
	owner: User,
	recipients: User[],
) => {
	const channel = DMChannel.create({
		name,
		owner,
		recipients: recipients,
		domain: config.federation.webapp_url.hostname,
	});

	await channel.save();

	setImmediate(async () => {
		await generateSigningKeys(channel);
		await sendActivity(
			channel.recipients,
			addContext({
				type: "Create",
				id: `${config.federation.instance_url.origin}${getExternalPathFromActor(channel)}/create`,
				actor: `${config.federation.instance_url.origin}${getExternalPathFromActor(channel.owner)}`,
				object: buildAPGroup(channel),
			}) as APCreate,
			channel.owner,
		);
	});

	emitGatewayEvent([...recipients.map((x) => x.id), owner.id], {
		type: "CHANNEL_CREATE",
		channel: channel.toPublic(),
	});

	return channel;
};

export const getOrFetchChannel = async (channel_id: string) => {
	const mention = splitQualifiedMention(channel_id);

	// TODO: this may break when we have other channel types
	let channel = await getDatabase()
		.createQueryBuilder(Channel, "channels")
		.select("channels")
		.leftJoinAndSelect("channels.recipients", "recipients")
		.leftJoinAndSelect("channels.owner", "owner")
		.leftJoinAndSelect("channels.guild", "guild")
		.leftJoinAndSelect("guild.owner", "guild_owner")
		.where((qb) => {
			qb.where("channels.id = :id", { id: mention.user }).andWhere(
				"channels.domain = :domain",
				{ domain: mention.domain },
			);
		})
		.orWhere(
			new Brackets((inner) => {
				inner
					.where("channels.remote_id = :lookup", {
						lookup: mention.user,
					})
					.andWhere("channels.domain = :domain", {
						domain: mention.domain,
					});
			}),
		)
		.getOne();

	if (!channel && config.federation.enabled) {
		// fetch from remote instance
		channel = await createChannelFromRemoteGroup(channel_id);
		await channel.save();
	} else if (!channel) throw new APError("Channel could not be found", 404);

	return channel;
};

export const createChannelFromRemoteGroup = async (
	lookup: string | APActor,
) => {
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

	if (!ObjectIsGroup(obj)) throw new APError("Resolved object is not Group");

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Group but does not contain public key",
		);

	if (!obj.attributedTo || typeof obj.attributedTo != "string")
		throw new APError(
			"Resolved group doesn't have attributedTo, we don't know what owns it",
		);

	if (typeof obj.inbox != "string" || typeof obj.outbox != "string")
		throw new APError("don't know how to handle embedded inbox/outbox");

	if (!obj.id) throw new APError("Remote object did not have ID");

	if (!obj.name) throw new APError("Remote 'channel' did not have name");

	const owner = await resolveChannelOwner(obj.attributedTo);

	if (!owner) throw new APError("Could not resolve channel owner");

	let channel: Channel = Channel.create({
		domain: mention.domain,
		remote_id: mention.user,
		name: obj.name,
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

	if (owner instanceof User) {
		if (!obj.followers)
			throw new APError("DMChannel must have followers collection");

		// note for next time u open:
		// messages federate properly,
		// but remote server can't fetch them because
		// it tries to fetch by local id and not remote id
		// so need to save remote id to db and fetch by that

		channel = DMChannel.create({
			...channel,

			owner,

			// TODO: fetch recipients over time
			recipients: await Promise.all([
				...(
					await resolveCollectionEntries(
						new URL(obj.followers.toString()),
					)
				)
					.filter((x) => x != obj.attributedTo)
					.map((x) => getOrFetchUser(x)),
			]),
		});
	} else if (owner instanceof Guild) {
		channel = GuildTextChannel.create({
			...channel,

			guild: owner,
		});
	} else throw new APError("Unrecognised channel type");

	return channel;
};

const resolveChannelOwner = async (lookup: string) => {
	// is lookup on our domain?

	const mention = splitQualifiedMention(lookup);

	const actor = await findActorOfAnyType(mention.user, mention.domain);
	if (actor) return actor;

	// otherwise, do a remote lookup

	const obj = await resolveAPObject(lookup);

	if (ObjectIsPerson(obj)) return await createUserForRemotePerson(obj);
	else if (ObjectIsOrganization(obj))
		return await createGuildFromRemoteOrg(obj);
	else throw new APError("unimplemented");
};
