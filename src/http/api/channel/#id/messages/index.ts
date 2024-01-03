import { Router } from "express";
import { z } from "zod";
import { Message } from "../../../../../entity";
import { DMChannel } from "../../../../../entity/DMChannel";
import {
	addContext,
	config,
	createLogger,
	route,
	splitQualifiedMention,
} from "../../../../../util";
import { HttpSig } from "../../../../../util/activitypub/httpsig";
import {
	buildAPAnnounceNote,
	buildAPNote,
} from "../../../../../util/activitypub/transformers";
import { getOrFetchChannel } from "../../../../../util/entity/channel";

const MessageCreate = z.object({
	content: z.string(),
});

const router = Router({ mergeParams: true });

const Log = createLogger("activitypub");

// Create a message in a channel
router.post(
	"/",
	route(
		{ body: MessageCreate, params: z.object({ channel_id: z.string() }) },
		async (req, res) => {
			const { channel_id } = req.params;

			const channel = await getOrFetchChannel(channel_id);

			const message = Message.create({
				channel,

				content: req.body.content,
				author: req.user,
			});

			await message.save();

			if (channel.domain == config.federation.webapp_url.hostname) {
				// this is an internal message
				// TODO: websocket gateway send to any online clients in this channel
			} else if (config.federation.enabled) {
				// todo: move
				// send this activity to remote instances

				const note = buildAPNote(message);
				const announce = buildAPAnnounceNote(note, message.channel.id);
				const withContext = addContext(announce);

				// TODO: fix
				let inbox: string;
				if (channel instanceof DMChannel)
					inbox = channel.recipients[0].collections.inbox;
				else throw new Error("unimplemented");

				const signed = HttpSig.sign(
					inbox,
					req.method,
					channel,
					`/channel/${channel.id}`,
					withContext,
				);

				setImmediate(async () => {
					const res = await fetch(inbox, signed);
					if (!res.ok)
						Log.error(
							`Error sending message to ${inbox}`,
							await res.text(),
						);
				});
			}

			return res.json(message.toPublic());
		},
	),
);

// Get messages of a channel
router.get(
	"/",
	route(
		{
			params: z.object({
				channel_id: z.string(),
				limit: z.number({ coerce: true }).max(50).min(1).default(50),

				// TODO: only allow a single of the following:
				after: z.string().optional(),
				before: z.string().optional(),
				around: z.string().optional(),
			}),
		},
		async (req, res) => {
			const channelMention = splitQualifiedMention(req.params.channel_id);

			// TODO: handle not fetched federated channels

			// TODO: handle after, before, around
			const messages = await Message.find({
				where: {
					channel: {
						id: channelMention.user,
						domain: channelMention.domain,
					},
				},
				take: req.params.limit,
				order: {
					published: "DESC",
				},
				loadRelationIds: true,
			});

			return res.json(messages.map(x => x.toPublic()));
		},
	),
);

export default router;
