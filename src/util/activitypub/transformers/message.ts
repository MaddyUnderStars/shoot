import type { APAnnounce, APCreate, APNote } from "activitypub-types";
import { ApCache, type Channel, Message } from "../../../entity";
import { getExternalPathFromActor } from "../../../sender";
import { config } from "../../config";
import { getOrFetchAttributedUser } from "../../entity";

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
	const instance_url = config.federation.instance_url.origin;
	const id = `${instance_url}/channel/${message.channel.id}/message/${message.id}`;
	const attributedTo = `${instance_url}${getExternalPathFromActor(message.author)}`;
	const to = `${instance_url}${getExternalPathFromActor(message.channel)}`;

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
		id: `${inner.id}/create`,
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
