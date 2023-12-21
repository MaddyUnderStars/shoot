import { APAnnounce, APCreate, APNote, APPerson } from "activitypub-types";
import { User } from "../../entity";
import type { Message } from "../../entity/message";
import { config } from "../config";

export const buildAPNote = (message: Message): APNote => {
	const id = `${config.federation.instance_url.origin}/message/${message.id}`;
	const attributedTo = `${config.federation.instance_url.origin}/user/${message.author.id}`;

	return {
		id,
		attributedTo,
		to: `${attributedTo}/followers`,	// TODO: to the channel it was sent to

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
	}
}

export const buildAPAnnounceNote = (inner: APNote, channel_id: string): APAnnounce => {
	const actor = `${config.federation.instance_url.origin}/channel/${channel_id}`;
	const to = "https://www.w3.org/ns/activitystreams#Public";	// TODO

	return {
		to,
		actor,

		id: `${actor}/message/${inner.id?.split("/").reverse()[0]}`,	// TODO
		type: "Announce",
		published: inner.published,
		object: inner,
	}
}

export const buildAPPerson = (user: User): APPerson => {
	const id = `/users/${user.username}`;

	const { webapp_url, instance_url } = config.federation;

	return {
		type: "Person",
		id: `${webapp_url.origin}${id}`,
		url: `${instance_url.origin}${id}`,

		preferredUsername: user.username,
		name: user.display_name,

		inbox: `${instance_url.origin}${id}/inbox`,
		outbox: `${instance_url.origin}${id}/outbox`,
		followers: `${instance_url.origin}${id}/followers`,
		following: `${instance_url.origin}${id}/following`,

		publicKey: {
			id: `${instance_url.origin}${id}#main-key`,
			owner: `${webapp_url.origin}${id}`,
			publicKeyPem: user.public_key,
		}
	}
}