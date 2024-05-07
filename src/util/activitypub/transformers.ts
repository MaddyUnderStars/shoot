import {
	APAnnounce,
	APCreate,
	APGroup,
	APNote,
	APOrganization,
	APPerson,
} from "activitypub-types";
import {
	ApCache,
	DMChannel,
	Guild,
	GuildTextChannel,
	User,
} from "../../entity";
import { Channel } from "../../entity/channel";
import { Message } from "../../entity/message";
import { getExternalPathFromActor } from "../../sender";
import { config } from "../config";
import { getOrFetchAttributedUser } from "../entity";
import { createXsdDate } from "../misc";
import { APError } from "./error";
import { InstanceActor } from "./instanceActor";

export const buildMessageFromAPNote = async (
	note: APNote,
	channel: Channel,
): Promise<Message> => {
	const author = await getOrFetchAttributedUser(note.attributedTo);
	await author.save();

	return Message.create({
		author,
		channel,
		reference_object: ApCache.create({ id: note.id, raw: note }),

		content: note.content,
	});
};

export const buildAPNote = (message: Message): APNote => {
	const id = `${config.federation.instance_url.origin}/channel/${message.channel.id}/message/${message.id}`;
	const attributedTo = `${config.federation.instance_url.origin}${getExternalPathFromActor(message.author)}`;
	const to = `${config.federation.instance_url.origin}${getExternalPathFromActor(message.channel)}`;

	return {
		type: "Note",
		id,
		published: message.published,
		attributedTo,
		to: [to, `${attributedTo}/followers`],
		cc: [
			// "https://www.w3.org/ns/activitystreams#Public"
		],
		content: message.content,
		updated: message.updated ?? undefined,
		summary: "",
		url: `${config.federation.webapp_url.origin}/channel/${message.channel.id}/message/${message.id}`,
	};
};

export const buildAPCreateNote = (inner: APNote): APCreate => {
	return {
		type: "Create",
		id: inner.id + "/create",
		actor: inner.attributedTo,
		to: inner.to,
		cc: inner.cc,
		object: inner,
	};
};

export const buildAPAnnounceNote = (
	inner: APNote,
	channel_id: string,
): APAnnounce => {
	const actor = `${config.federation.instance_url.origin}/channel/${channel_id}`;
	// TODO: this should be channel_id followers

	return {
		id: `${actor}/message/${inner.id?.split("/").reverse()[0]}/announce`, // TODO
		type: "Announce",
		actor,
		published: inner.published,

		to: inner.to,
		cc: inner.cc,

		object: inner,
	};
};

export const buildAPPerson = (user: User): APPerson => {
	const id = user.id == InstanceActor.id ? `/actor` : `/users/${user.name}`;

	const { webapp_url, instance_url } = config.federation;

	return {
		type: "Person",
		id: `${instance_url.origin}${id}`,
		url: `${webapp_url.origin}${id}`,

		preferredUsername: user.name,
		name: user.display_name,

		summary: user.summary || undefined,

		published: createXsdDate(user.registered_date),

		inbox: `${instance_url.origin}${id}/inbox`,
		outbox: `${instance_url.origin}${id}/outbox`,
		followers: `${instance_url.origin}${id}/followers`,
		following: `${instance_url.origin}${id}/following`,

		endpoints: {
			sharedInbox: `${instance_url.origin}/inbox`,
		},

		publicKey: {
			id: `${config.federation.instance_url.origin}${id}`,
			owner: `${config.federation.webapp_url.origin}${id}`,
			publicKeyPem: user.public_key,
		},
	};
};

export const buildAPOrganization = (guild: Guild): APOrganization => {
	const id = getExternalPathFromActor(guild);

	const { webapp_url, instance_url } = config.federation;

	const owner = `${instance_url.origin}${getExternalPathFromActor(guild.owner)}`;

	return {
		type: "Organization",
		id: `${instance_url.origin}${id}`,
		url: `${webapp_url.origin}${id}`,

		attributedTo: owner,

		preferredUsername: guild.id,
		name: guild.name,

		inbox: `${instance_url.origin}${id}/inbox`,
		outbox: `${instance_url.origin}${id}/outbox`,
		followers: `${instance_url.origin}${id}/followers`,
		following: `${instance_url.origin}${id}/following`,

		publicKey: {
			id: `${instance_url.origin}${id}`,
			owner: `${webapp_url.origin}${id}`,
			publicKeyPem: guild.public_key,
		},
	};
};

export const buildAPGroup = (channel: Channel): APGroup => {
	const id = getExternalPathFromActor(channel);

	const { webapp_url, instance_url } = config.federation;

	let owner;
	if (channel instanceof DMChannel)
		owner = `${instance_url.origin}${getExternalPathFromActor(channel.owner)}`;
	else if (channel instanceof GuildTextChannel)
		owner = `${instance_url.origin}${getExternalPathFromActor(channel.guild)}`;
	else throw new APError("huh?");

	return {
		type: "Group",
		id: `${instance_url.origin}${id}`,
		url: `${webapp_url.origin}${id}`,

		preferredUsername: channel.id,
		name: channel.name,

		attributedTo: owner,

		inbox: `${instance_url.origin}${id}/inbox`,
		outbox: `${instance_url.origin}${id}/outbox`,
		followers: `${instance_url.origin}${id}/followers`,
		following: `${instance_url.origin}${id}/following`,

		publicKey: {
			id: `${instance_url.origin}${id}`,
			owner: `${webapp_url.origin}${id}`,
			publicKeyPem: channel.public_key,
		},
	};
};
