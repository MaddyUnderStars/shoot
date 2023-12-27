import crypto from "crypto";
import { promisify } from "util";
const generateKeyPair = promisify(crypto.generateKeyPair);

import { User } from "../../entity";
import { DMChannel } from "../../entity/DMChannel";
import { Channel } from "../../entity/channel";
import {
	APError,
	createChannelFromRemoteGroup,
	splitQualifiedMention,
} from "../activitypub";
import { config } from "../config";
import { getDatabase } from "../database";
import { createLogger } from "../log";
import { KEY_OPTIONS } from "../rsa";

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
