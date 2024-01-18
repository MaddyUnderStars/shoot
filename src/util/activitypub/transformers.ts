import {
	APAnnounce,
	APCreate,
	APGroup,
	APNote,
	APPerson,
} from "activitypub-types";
import { ApCache, DMChannel, User } from "../../entity";
import { Channel } from "../../entity/channel";
import { Message } from "../../entity/message";
import { config } from "../config";
import { getOrFetchAttributedUser } from "../entity";
import { createXsdDate } from "../misc";
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
	const id = `${config.federation.instance_url.origin}/message/${message.id}`;
	const attributedTo = `${config.federation.instance_url.origin}/user/${message.author.id}`;
	const to = `${config.federation.instance_url.origin}/channel/${message.channel.id}`;

	return {
		id,
		attributedTo,
		to,

		type: "Note",
		content: message.content,
		published: message.published,
		updated: message.updated ?? undefined,
	};
};

export const buildAPCreateNote = (inner: APNote): APCreate => {
	return {
		type: "Create",
		actor: inner.attributedTo,
		object: inner,
	};
};

export const buildAPAnnounceNote = (
	inner: APNote,
	channel_id: string,
): APAnnounce => {
	const actor = `${config.federation.instance_url.origin}/channel/${channel_id}`;
	// TODO: this should be channel_id followers
	const to = ["https://www.w3.org/ns/activitystreams#Public"];

	return {
		to,
		actor,

		cc: [ `${actor}/followers` ],

		id: `${actor}/message/${inner.id?.split("/").reverse()[0]}`, // TODO
		type: "Announce",
		published: inner.published,
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

export const buildAPGroup = (channel: Channel): APGroup => {
	const id = `/channel/${channel.id}`;

	const { webapp_url, instance_url } = config.federation;

	const owner =
		channel instanceof DMChannel
			? `${instance_url.origin}/users/${channel.owner.name}`
			: undefined;

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
