import type { APAnnounce, APCreate, APNote } from "activitypub-types";
import { ApCache } from "../../../entity/apcache";
import type { Channel } from "../../../entity/channel";
import { Message } from "../../../entity/message";
import { getExternalPathFromActor } from "../../../sender";
import { config } from "../../config";
import { getOrFetchAttributedUser } from "../../entity/user";
import { makeInstanceUrl } from "../../url";

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
	const id = makeInstanceUrl(
		`/channel/${message.channel.id}/message/${message.id}`,
	);
	const attributedTo = makeInstanceUrl(
		`${getExternalPathFromActor(message.author)}`,
	);
	const to = makeInstanceUrl(`${getExternalPathFromActor(message.channel)}`);

	return {
		type: "Note",
		id,
		published: message.published,
		attributedTo,
		to: [to, `${attributedTo}/followers`],
		cc: [
			// "https://www.w3.org/ns/activitystreams#Public"
		],
		content: message.content ?? undefined,
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
	const actor = makeInstanceUrl(`/channel/${channel_id}`);
	// TODO: this should be channel_id followers

	return {
		id: new URL(
			`/message/${inner.id?.split("/").reverse()[0]}/announce`,
			actor,
		).toString(), // TODO
		type: "Announce",
		actor,
		published: inner.published,

		to: inner.to,
		cc: inner.cc,

		object: inner,
	};
};
