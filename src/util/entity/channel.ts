import crypto from "crypto";
import { promisify } from "util";
const generateKeyPair = promisify(crypto.generateKeyPair);

import { APActor, ObjectIsGroup } from "activitypub-types";
import { User } from "../../entity";
import { DMChannel } from "../../entity/DMChannel";
import { Channel } from "../../entity/channel";
import {
	APError,
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
import { getOrFetchUser } from "./user";

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

	setImmediate(() => generateSigningKeys(channel));

	emitGatewayEvent([...recipients.map((x) => x.id), owner.id], {
		type: "CHANNEL_CREATE",
		channel: channel.toPublic(),
	});

	// federate dm channel creation

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
		.where((qb) => {
			qb.where("channels.id = :id", { id: mention.user }).andWhere(
				"channels.domain = :domain",
				{ domain: mention.domain },
			);
		})
		.orWhere("channels.remote_address = :lookup", { lookup: channel_id })
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

	let channel: Channel;
	// TODO: check type of channel of remote obj
	switch ("dm") {
		case "dm":
			if (!obj.followers)
				throw new APError("DMChannel must have followers collection");

			// note for next time u open:
			// messages federate properly,
			// but remote server can't fetch them because
			// it tries to fetch by local id and not remote id
			// so need to save remote id to db and fetch by that

			channel = DMChannel.create({
				domain: mention.domain,
				remote_id: mention.user,

				name: obj.name,
				owner: await getOrFetchUser(obj.attributedTo),

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
			break;
		default:
			throw new APError("Resolved group was not a recognisable type");
	}

	return channel;
};
