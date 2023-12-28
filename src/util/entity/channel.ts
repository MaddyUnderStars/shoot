import crypto from "crypto";
import { promisify } from "util";
const generateKeyPair = promisify(crypto.generateKeyPair);

import { APActor, ObjectIsGroup } from "activitypub-types";
import { User } from "../../entity";
import { DMChannel } from "../../entity/DMChannel";
import { Channel } from "../../entity/channel";
import { APError, resolveAPObject, resolveWebfinger, splitQualifiedMention } from "../activitypub";
import { config } from "../config";
import { getDatabase } from "../database";
import { createLogger } from "../log";
import { KEY_OPTIONS } from "../rsa";
import { tryParseUrl } from "../url";
import { getOrFetchUser } from "./user";

const Log = createLogger("channels");

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
		const start = Date.now();
		const keys = await generateKeyPair("rsa", KEY_OPTIONS);

		await Channel.update(
			{ id: channel.id },
			{ public_key: keys.publicKey, private_key: keys.privateKey },
		);

		Log.verbose(
			`Generated keys for channel '${channel.name} in ${
				Date.now() - start
			}ms`,
		);
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
		.where("channels.id = :id", { id: mention.user })
		.andWhere("channels.domain = :domain", { domain: mention.domain })
		.getOne();

	if (!channel && config.federation.enabled) {
		// fetch from remote instance
		channel = await createChannelFromRemoteGroup(channel_id);
		await channel.save();
	} else if (!channel) throw new APError("Channel could not be found", 404);

	return channel;
};

export const createChannelFromRemoteGroup = async (
	lookup: string | APActor
) => {
	const obj = typeof lookup == "string"
		? tryParseUrl(lookup)
			? await resolveAPObject(lookup)
			: await resolveWebfinger(lookup)
		: lookup;

	if (!ObjectIsGroup(obj)) throw new APError("Resolved object is not Group");

	if (!obj.publicKey?.publicKeyPem)
		throw new APError(
			"Resolved object is Group but does not contain public key"
		);

	if (!obj.attributedTo || typeof obj.attributedTo != "string")
		throw new APError(
			"Resolved group doesn't have attributedTo, we don't know what owns it"
		);

	let channel: Channel;
	// TODO: check type of channel of remote obj
	switch ("dm") {
		case "dm":
			channel = DMChannel.create({
				name: obj.name,
				owner: await getOrFetchUser(obj.attributedTo),
				recipients: [],
				remote_address: obj.id,
				public_key: obj.publicKey.publicKeyPem,
			});
			// TODO: start fetching recipients over time
			break;
		default:
			throw new APError("Resolved group was not a recognisable type");
	}

	return channel;
};