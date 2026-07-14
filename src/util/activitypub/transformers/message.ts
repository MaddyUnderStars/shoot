import { ApCache } from "../../../entity/apcache.js";
import type { Channel } from "../../../entity/channel.js";
import { Message } from "../../../entity/message.js";
import { getExternalPathFromActor } from "../../../sender/index.js";
import { getOrFetchAttributedUser } from "../../entity/user.js";
import { makeInstanceUrl, makeWebappUrl } from "../../url.js";
import { DMChannel } from "../../../entity/DMChannel.js";
import { APMessage } from "../types/APMessage.js";
import { APCreate } from "@shootpub/activitypub-types/activities/create";
import { APAnnounce } from "@shootpub/activitypub-types/activities/announce";

export const buildMessageFromAPNote = async (
	note: APMessage,
	channel: Channel,
): Promise<Message> => {
	const author = await getOrFetchAttributedUser(note.attributedTo);
	await author.save();

	return Message.create({
		author,
		channel,
		reference_object: ApCache.create({ id: note.id.toString(), raw: note }),

		content: note.content,
	});
};

export const buildAPNote = (message: Message): APMessage => {
	const id = makeInstanceUrl(`/channel/${message.channel.id}/message/${message.id}`);
	const attributedTo = makeInstanceUrl(getExternalPathFromActor(message.author));
	const to = makeInstanceUrl(getExternalPathFromActor(message.channel));

	let toField: string[];

	if (message.channel instanceof DMChannel) {
		let recipients = [...message.channel.recipients, message.channel.owner];
		recipients = recipients.filter((x) => x.mention !== message.author.mention);

		toField = recipients.map(
			(x) => x.remote_address || makeInstanceUrl(getExternalPathFromActor(x)),
		);
	} else {
		toField = [to, `${attributedTo}/followers`];
	}

	return {
		type: "Note",
		id,
		published: message.published,
		attributedTo,
		to: toField,
		cc: [
			// "https://www.w3.org/ns/activitystreams#Public"
		],
		content: message.content ?? undefined,
		updated: message.updated ?? undefined,
		summary: "",
		url: makeWebappUrl(`/channel/${message.channel.id}/message/${message.id}`),
		audience: makeInstanceUrl(getExternalPathFromActor(message.channel)),
	};
};

export const buildAPCreateNote = (inner: APMessage): APCreate => {
	return {
		type: "Create",
		id: `${inner.id}/create`,
		actor: inner.attributedTo,
		to: inner.to,
		cc: inner.cc,
		object: inner,
	};
};

export const buildAPAnnounceNote = (inner: APMessage, channel_id: string): APAnnounce => {
	const actor = makeInstanceUrl(`/channel/${channel_id}`);
	// TODO: this should be channel_id followers

	return {
		id: new URL(
			`/message/${inner.id.toString().split("/").toReversed()[0]}/announce`,
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
