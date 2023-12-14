import { APAnnounce, APCreate, APNote } from "activitypub-types";
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